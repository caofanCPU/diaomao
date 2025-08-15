/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { 
  stripe,
  updateSubscription,
  cancelSubscription,
  getPriceConfig 
} from '@/lib/stripe-config';
import { 
  userService,
  subscriptionService,
  transactionService,
  SubscriptionStatus,
  TransactionType,
  OrderStatus,
  PaySupplier 
} from '@/services/database';

// Update subscription schema
const updateSubscriptionSchema = z.object({
  action: z.enum(['upgrade', 'downgrade', 'cancel', 'reactivate']),
  newPriceId: z.string().optional(),
  cancelAtPeriodEnd: z.boolean().default(true),
});

// GET - Get current subscription status
export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Find user by clerk ID
    const user = await userService.findByClerkUserId(clerkUserId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get active subscriptions
    const subscriptions = await subscriptionService.findByUserId(user.userId);
    
    const activeSubscriptions = subscriptions
      .filter(sub => sub.status === SubscriptionStatus.ACTIVE)
      .map(sub => ({
        subscriptionId: sub.subscriptionId,
        paySubscriptionId: sub.paySubscriptionId,
        priceName: sub.priceName,
        priceId: sub.priceId,
        status: sub.status,
        creditsAllocated: sub.creditsAllocated,
        periodStart: sub.subPeriodStart,
        periodEnd: sub.subPeriodEnd,
        createdAt: sub.createdAt,
      }));

    return NextResponse.json({
      success: true,
      data: {
        hasActiveSubscription: activeSubscriptions.length > 0,
        subscriptions: activeSubscriptions,
      },
    });

  } catch (error) {
    console.error('Get subscription status error:', error);
    return NextResponse.json(
      { error: 'Failed to get subscription status' },
      { status: 500 }
    );
  }
}

// PUT - Update subscription (upgrade/downgrade/cancel)
export async function PUT(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { action, newPriceId, cancelAtPeriodEnd } = updateSubscriptionSchema.parse(body);

    // Find user by clerk ID
    const user = await userService.findByClerkUserId(clerkUserId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get current active subscription
    const subscriptions = await subscriptionService.findByUserId(user.userId);
    const activeSubscription = subscriptions.find(sub => sub.status === SubscriptionStatus.ACTIVE);
    
    if (!activeSubscription || !activeSubscription.paySubscriptionId) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    let result;

    switch (action) {
      case 'upgrade':
      case 'downgrade': {
        if (!newPriceId) {
          return NextResponse.json(
            { error: 'New price ID required for upgrade/downgrade' },
            { status: 400 }
          );
        }

        // Validate new price
        const newPriceConfig = getPriceConfig(newPriceId);
        if (!newPriceConfig) {
          return NextResponse.json(
            { error: 'Invalid new price ID' },
            { status: 400 }
          );
        }

        // Update subscription in Stripe
        const updatedStripeSubscription = await updateSubscription({
          subscriptionId: activeSubscription.paySubscriptionId,
          priceId: newPriceId,
          prorationBehavior: 'create_prorations',
        });

        // Update subscription in database
        await subscriptionService.updateSubscription(activeSubscription.id.toString(), {
          priceId: newPriceId,
          priceName: newPriceConfig.priceName,
          creditsAllocated: newPriceConfig.credits,
          updatedAt: new Date(),
        });

        // Create transaction record for the change
        const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2)}`;
        await transactionService.createTransaction({
          userId: user.userId,
          orderId,
          orderStatus: OrderStatus.SUCCESS,
          paySupplier: PaySupplier.STRIPE,
          paySubscriptionId: activeSubscription.paySubscriptionId,
          priceId: newPriceId,
          priceName: newPriceConfig.priceName,
          type: TransactionType.SUBSCRIPTION,
          creditsGranted: newPriceConfig.credits,
          orderDetail: `Subscription ${action}: ${activeSubscription.priceName} -> ${newPriceConfig.priceName}`,
          payCreatedAt: new Date(),
        });

        result = {
          action,
          subscriptionId: updatedStripeSubscription.id,
          newPlan: newPriceConfig.priceName,
          newCredits: newPriceConfig.credits,
        };
        break;
      }

      case 'cancel': {
        // Cancel subscription in Stripe
        const cancelledStripeSubscription = await cancelSubscription(
          activeSubscription.paySubscriptionId,
          cancelAtPeriodEnd
        );

        // Update subscription status in database
        const newStatus = cancelAtPeriodEnd ? SubscriptionStatus.CANCELED : SubscriptionStatus.CANCELED;
        await subscriptionService.updateSubscription(activeSubscription.id.toString(), {
          status: newStatus,
          updatedAt: new Date(),
        });

        result = {
          action: 'cancel',
          cancelAtPeriodEnd,
          cancelDate: cancelAtPeriodEnd 
            ? (cancelledStripeSubscription as any).current_period_end 
            : Math.floor(Date.now() / 1000),
        };
        break;
      }

      case 'reactivate': {
        // Reactivate subscription in Stripe
        const reactivatedSubscription = await stripe.subscriptions.update(
          activeSubscription.paySubscriptionId,
          {
            cancel_at_period_end: false,
          }
        );

        // Update subscription status in database
        await subscriptionService.updateSubscription(activeSubscription.id.toString(), {
          status: SubscriptionStatus.ACTIVE,
          updatedAt: new Date(),
        });

        result = {
          action: 'reactivate',
          subscriptionId: reactivatedSubscription.id,
          status: 'active',
        };
        break;
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('Update subscription error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update subscription' },
      { status: 500 }
    );
  }
}