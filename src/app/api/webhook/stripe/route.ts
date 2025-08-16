/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { 
  stripe,
  validateStripeWebhook
} from '@/lib/stripe-config';
import { 
  userService,
  subscriptionService,
  transactionService,
  creditService,
  creditUsageService,
  OrderStatus,
  SubscriptionStatus,
  TransactionType,
  CreditType,
  OperationType,
  PaySupplier
} from '@/services/database';

export async function POST(request: NextRequest) {
  try {
    // Get the raw body
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      console.error('Missing Stripe signature');
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    // Validate webhook signature
    let event: Stripe.Event;
    try {
      event = validateStripeWebhook(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log('Stripe webhook received:', event.type, event.id);

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

// Handle successful checkout session completion
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    console.log('Processing checkout.session.completed:', session.id);

    const userId = session.client_reference_id;
    const sessionId = session.id;
    // const metadata = session.metadata; // Not used

    if (!userId) {
      console.error('Missing user ID in checkout session');
      return;
    }

    // Find transaction by session ID
    const transaction = await transactionService.findByPaySessionId(sessionId);
    if (!transaction) {
      console.error('Transaction not found for session:', sessionId);
      return;
    }

    // Update transaction with payment details
    await transactionService.updateStatus(transaction.orderId, OrderStatus.SUCCESS, {
      payTransactionId: session.payment_intent as string,
      payCreatedAt: new Date(),
      payDetail: JSON.stringify({
        customer_details: session.customer_details,
        payment_status: session.payment_status,
        total_details: session.total_details,
      }),
      payUpdatedAt: new Date(),
    });

    // Process credit allocation
    if (transaction.creditsGranted && transaction.creditsGranted > 0) {
      await allocateCreditsToUser(
        userId,
        transaction.creditsGranted,
        transaction.orderId,
        transaction.type === TransactionType.SUBSCRIPTION ? 'subscription' : 'purchase'
      );
    }

    // If this is a subscription, create/update subscription record
    if (session.mode === 'subscription' && session.subscription) {
      await processSubscriptionFromSession(session, userId, transaction);
    }

    console.log('Checkout session processed successfully:', session.id);

  } catch (error) {
    console.error('Error processing checkout session:', error);
    throw error;
  }
}

// Handle successful invoice payment (subscription renewal)
async function handleInvoicePaid(invoice: Stripe.Invoice) {
  try {
    console.log('Processing invoice.paid:', invoice.id);

    if (!(invoice as any).subscription) {
      console.log('Invoice not associated with subscription, skipping');
      return;
    }

    // Get subscription details
    const stripeSubscription = await stripe.subscriptions.retrieve((invoice as any).subscription as string);
    const customerId = invoice.customer as string;
    
    // Find user by customer ID or subscription ID
    const user = await findUserByStripeData(customerId, stripeSubscription.id);
    if (!user) {
      console.error('User not found for subscription:', stripeSubscription.id);
      return;
    }

    // Find subscription in our database
    const subscription = await subscriptionService.findByPaySubscriptionId(stripeSubscription.id);
    if (!subscription) {
      console.error('Subscription not found in database:', stripeSubscription.id);
      return;
    }

    // Create transaction record for renewal
    const orderId = `order_renewal_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    // const priceConfig = getPriceConfig(subscription.priceId || ''); // Not used
    
    const renewalTransaction = await transactionService.createTransaction({
      userId: user.userId,
      orderId,
      orderStatus: OrderStatus.SUCCESS,
      paySupplier: PaySupplier.STRIPE,
      paySubscriptionId: stripeSubscription.id,
      payInvoiceId: invoice.id,
      priceId: subscription.priceId || undefined,
      priceName: subscription.priceName || undefined,
      amount: invoice.amount_paid / 100, // Convert from cents
      currency: invoice.currency,
      type: TransactionType.SUBSCRIPTION,
      creditsGranted: subscription.creditsAllocated,
      subPeriodStart: new Date((stripeSubscription as any).current_period_start * 1000),
      subPeriodEnd: new Date((stripeSubscription as any).current_period_end * 1000),
      orderDetail: `Subscription renewal: ${subscription.priceName}`,
      payCreatedAt: new Date(invoice.status_transitions.paid_at! * 1000),
      payUpdatedAt: new Date(),
    });

    // Update subscription period
    await subscriptionService.updateSubscription(subscription.id, {
      subPeriodStart: new Date((stripeSubscription as any).current_period_start * 1000),
      subPeriodEnd: new Date((stripeSubscription as any).current_period_end * 1000),
      status: SubscriptionStatus.ACTIVE,
      updatedAt: new Date(),
    });

    // Allocate credits for renewal
    if (subscription.creditsAllocated > 0) {
      await allocateCreditsToUser(
        user.userId,
        subscription.creditsAllocated,
        renewalTransaction.orderId,
        'renewal'
      );
    }

    console.log('Invoice processed successfully:', invoice.id);

  } catch (error) {
    console.error('Error processing invoice:', error);
    throw error;
  }
}

// Handle failed invoice payment
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  try {
    console.log('Processing invoice.payment_failed:', invoice.id);

    if (!(invoice as any).subscription) {
      return;
    }

    const stripeSubscription = await stripe.subscriptions.retrieve((invoice as any).subscription as string);
    const user = await findUserByStripeData(invoice.customer as string, stripeSubscription.id);
    
    if (!user) {
      console.error('User not found for failed payment:', stripeSubscription.id);
      return;
    }

    // Update subscription status to past due
    const subscription = await subscriptionService.findByPaySubscriptionId(stripeSubscription.id);
    if (subscription) {
      await subscriptionService.updateSubscription(subscription.id, {
        status: SubscriptionStatus.PAST_DUE,
        updatedAt: new Date(),
      });
    }

    // Create failed transaction record
    const orderId = `order_failed_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    await transactionService.createTransaction({
      userId: user.userId,
      orderId,
      orderStatus: OrderStatus.FAILED,
      paySupplier: PaySupplier.STRIPE,
      paySubscriptionId: stripeSubscription.id,
      payInvoiceId: invoice.id,
      priceId: subscription?.priceId || undefined,
      priceName: subscription?.priceName || undefined,
      amount: invoice.amount_due / 100,
      currency: invoice.currency,
      type: TransactionType.SUBSCRIPTION,
      orderDetail: `Subscription payment failed: ${subscription?.priceName}`,
      payCreatedAt: new Date(invoice.created * 1000),
      payUpdatedAt: new Date(),
    });

    console.log('Failed payment processed:', invoice.id);

  } catch (error) {
    console.error('Error processing failed payment:', error);
    throw error;
  }
}

// Handle subscription created
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  try {
    console.log('Processing customer.subscription.created:', subscription.id);
    
    // This is usually handled in checkout.session.completed
    // But we can update subscription details here if needed
    const dbSubscription = await subscriptionService.findByPaySubscriptionId(subscription.id);
    if (dbSubscription) {
      await subscriptionService.updateSubscription(dbSubscription.id, {
        status: subscription.status as SubscriptionStatus,
        subPeriodStart: new Date((subscription as any).current_period_start * 1000),
        subPeriodEnd: new Date((subscription as any).current_period_end * 1000),
        updatedAt: new Date(),
      });
    }

  } catch (error) {
    console.error('Error processing subscription created:', error);
    throw error;
  }
}

// Handle subscription updated
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    console.log('Processing customer.subscription.updated:', subscription.id);

    const dbSubscription = await subscriptionService.findByPaySubscriptionId(subscription.id);
    if (!dbSubscription) {
      console.error('Subscription not found in database:', subscription.id);
      return;
    }

    // Update subscription status and period
    await subscriptionService.updateSubscription(dbSubscription.id, {
      status: subscription.status as SubscriptionStatus,
      subPeriodStart: new Date((subscription as any).current_period_start * 1000),
      subPeriodEnd: new Date((subscription as any).current_period_end * 1000),
      updatedAt: new Date(),
    });

    console.log('Subscription updated:', subscription.id);

  } catch (error) {
    console.error('Error processing subscription updated:', error);
    throw error;
  }
}

// Handle subscription deleted/canceled
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    console.log('Processing customer.subscription.deleted:', subscription.id);

    const dbSubscription = await subscriptionService.findByPaySubscriptionId(subscription.id);
    if (!dbSubscription) {
      console.error('Subscription not found in database:', subscription.id);
      return;
    }

    // Update subscription status to canceled
    await subscriptionService.updateSubscription(dbSubscription.id, {
      status: SubscriptionStatus.CANCELED,
      updatedAt: new Date(),
    });

    console.log('Subscription canceled:', subscription.id);

  } catch (error) {
    console.error('Error processing subscription deleted:', error);
    throw error;
  }
}

// Handle charge refunded
async function handleChargeRefunded(charge: Stripe.Charge) {
  try {
    console.log('Processing charge.refunded:', charge.id);

    // Find transaction by payment intent or charge ID
    const transaction = await transactionService.findByPayTransactionId(charge.payment_intent as string);
    if (!transaction) {
      console.error('Transaction not found for refunded charge:', charge.id);
      return;
    }

    // Update transaction status
    await transactionService.updateStatus(transaction.orderId, OrderStatus.REFUNDED, {
            payUpdatedAt: new Date(),
    });

    // Deduct refunded credits from user balance
    if (transaction.creditsGranted && transaction.creditsGranted > 0) {
      await deductCreditsFromUser(
        transaction.userId,
        transaction.creditsGranted,
        transaction.orderId,
        'refund'
      );
    }

    console.log('Refund processed:', charge.id);

  } catch (error) {
    console.error('Error processing refund:', error);
    throw error;
  }
}

// Helper function to allocate credits to user
async function allocateCreditsToUser(
  userId: string,
  creditsAmount: number,
  orderId: string,
  reason: string
) {
  try {
    // Get or create user credits record
    let credits = await creditService.getCredits(userId);
    if (!credits) {
      credits = await creditService.initializeCredits(userId, 0, 0);
    }

    // Update paid credits
    await creditService.rechargeCredits(userId, creditsAmount, CreditType.PAID, orderId, reason);

    // Record credit usage
    await creditUsageService.recordCreditOperation({
      userId,
      feature: `Credit allocation (${reason})`,
      orderId,
      creditType: CreditType.PAID,
      operationType: OperationType.RECHARGE,
      creditsUsed: creditsAmount,
    });

    console.log(`Allocated ${creditsAmount} credits to user ${userId} (${reason})`);

  } catch (error) {
    console.error('Error allocating credits:', error);
    throw error;
  }
}

// Helper function to deduct credits from user (for refunds)
async function deductCreditsFromUser(
  userId: string,
  creditsAmount: number,
  orderId: string,
  reason: string
) {
  try {
    const credits = await creditService.getCredits(userId);
    if (!credits) {
      console.error('Credits record not found for user:', userId);
      return;
    }

    // Deduct from paid credits first
    // const newBalancePaid = Math.max(0, credits.balancePaid - creditsAmount); // Not used
    // const remainingToDeduct = creditsAmount - (credits.balancePaid - newBalancePaid); // Not used
    // const newBalanceFree = remainingToDeduct > 0 ? Math.max(0, credits.balanceFree - remainingToDeduct) : credits.balanceFree; // Not used

    await creditService.consumeCredits(userId, creditsAmount, CreditType.PAID, orderId || 'webhook_refund');
    

    // Record credit deduction
    await creditUsageService.recordCreditOperation({
      userId,
      feature: `Credit deduction (${reason})`,
      orderId,
      creditType: CreditType.PAID,
      operationType: OperationType.CONSUME,
      creditsUsed: creditsAmount,
    });

    console.log(`Deducted ${creditsAmount} credits from user ${userId} (${reason})`);

  } catch (error) {
    console.error('Error deducting credits:', error);
    throw error;
  }
}

// Helper function to find user by Stripe customer or subscription ID
async function findUserByStripeData(customerId: string, subscriptionId: string) {
  try {
    // Try to find by subscription ID first
    const subscription = await subscriptionService.findByPaySubscriptionId(subscriptionId);
    if (subscription) {
      return await userService.findByUserId(subscription.userId);
    }

    // If not found, try to find user by Stripe customer metadata
    const customer = await stripe.customers.retrieve(customerId);
    if (customer && !customer.deleted && customer.metadata?.user_id) {
      return await userService.findByUserId(customer.metadata.user_id);
    }

    return null;
  } catch (error) {
    console.error('Error finding user by Stripe data:', error);
    return null;
  }
}

// Helper function to process subscription from checkout session
async function processSubscriptionFromSession(
  session: Stripe.Checkout.Session,
  userId: string,
  transaction: any
) {
  try {
    const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription as string);
    // const priceConfig = getPriceConfig(transaction.priceId); // Not used

    // Create or update subscription record
    const existingSubscription = await subscriptionService.findByPaySubscriptionId(stripeSubscription.id);
    
    if (existingSubscription) {
      // Update existing subscription
      await subscriptionService.updateSubscription(existingSubscription.id, {
        status: stripeSubscription.status as SubscriptionStatus,
        subPeriodStart: new Date((stripeSubscription as any).current_period_start * 1000),
        subPeriodEnd: new Date((stripeSubscription as any).current_period_end * 1000),
        updatedAt: new Date(),
      });
    } else {
      // Create new subscription record
      await subscriptionService.createSubscription({
        userId,
        paySubscriptionId: stripeSubscription.id,
        priceId: transaction.priceId,
        priceName: transaction.priceName,
        status: stripeSubscription.status as SubscriptionStatus,
        creditsAllocated: transaction.creditsGranted || 0,
        subPeriodStart: new Date((stripeSubscription as any).current_period_start * 1000),
        subPeriodEnd: new Date((stripeSubscription as any).current_period_end * 1000),
      });
    }

  } catch (error) {
    console.error('Error processing subscription from session:', error);
    throw error;
  }
}