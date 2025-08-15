import Stripe from 'stripe';

// Stripe Configuration
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

// Stripe Price Configuration
// 根据设计文档定义的价格计划
export const STRIPE_PRICES = {
  // 基础版计划 (￥70/月, 100积分)
  BASIC_MONTHLY: {
    priceId: process.env.STRIPE_PRICE_BASIC_MONTHLY!,
    priceName: '基础版',
    amount: 70,
    currency: 'cny',
    interval: 'month',
    credits: 100,
    description: '基础版计划 - 每月100积分',
  },
  
  // 专业版计划 (￥140/月, 250积分)  
  PRO_MONTHLY: {
    priceId: process.env.STRIPE_PRICE_PRO_MONTHLY!,
    priceName: '专业版',
    amount: 140,
    currency: 'cny',
    interval: 'month',
    credits: 250,
    description: '专业版计划 - 每月250积分',
  },
  
  // 企业版计划 (￥350/月, 1000积分)
  ENTERPRISE_MONTHLY: {
    priceId: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY!,
    priceName: '企业版',
    amount: 350,
    currency: 'cny', 
    interval: 'month',
    credits: 1000,
    description: '企业版计划 - 每月1000积分',
  },
  
  // 一次性积分包
  CREDITS_100: {
    priceId: process.env.STRIPE_PRICE_CREDITS_100!,
    priceName: '100积分包',
    amount: 35,
    currency: 'cny',
    interval: null,
    credits: 100,
    description: '一次性购买100积分',
  },
  
  CREDITS_500: {
    priceId: process.env.STRIPE_PRICE_CREDITS_500!,
    priceName: '500积分包', 
    amount: 150,
    currency: 'cny',
    interval: null,
    credits: 500,
    description: '一次性购买500积分',
  },
} as const;

// Price ID to Price Config mapping
export const getPriceConfig = (priceId: string) => {
  return Object.values(STRIPE_PRICES).find(config => config.priceId === priceId);
};

// Webhook Configuration
export const STRIPE_WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'invoice.paid',
  'invoice.payment_failed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'charge.refunded',
] as const;

// Helper function to validate webhook signature
export const validateStripeWebhook = (
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event => {
  return stripe.webhooks.constructEvent(payload, signature, secret);
};

// Helper function to create checkout session
export const createCheckoutSession = async (params: {
  priceId: string;
  customerId?: string;
  clientReferenceId: string; // user_id
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}): Promise<Stripe.Checkout.Session> => {
  const { priceId, customerId, clientReferenceId, successUrl, cancelUrl, metadata } = params;
  
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: clientReferenceId,
    metadata,
  };

  // 如果是一次性支付（积分包），改为payment模式
  const priceConfig = getPriceConfig(priceId);
  if (priceConfig && !priceConfig.interval) {
    sessionParams.mode = 'payment';
  }

  // 如果有客户ID，添加到session
  if (customerId) {
    sessionParams.customer = customerId;
  }

  return await stripe.checkout.sessions.create(sessionParams);
};

// Helper function to create or retrieve customer
export const createOrGetCustomer = async (params: {
  email?: string;
  userId: string;
  name?: string;
}): Promise<Stripe.Customer> => {
  const { email, userId, name } = params;

  // 先尝试查找现有客户
  if (email) {
    const existingCustomers = await stripe.customers.list({
      email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      return existingCustomers.data[0];
    }
  }

  // 创建新客户
  const customerParams: Stripe.CustomerCreateParams = {
    metadata: {
      user_id: userId,
    },
  };

  if (email) {
    customerParams.email = email;
  }

  if (name) {
    customerParams.name = name;
  }

  return await stripe.customers.create(customerParams);
};

// Helper function to update subscription
export const updateSubscription = async (params: {
  subscriptionId: string;
  priceId: string;
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
}): Promise<Stripe.Subscription> => {
  const { subscriptionId, priceId, prorationBehavior = 'create_prorations' } = params;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  return await stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: priceId,
      },
    ],
    proration_behavior: prorationBehavior,
  });
};

// Helper function to cancel subscription
export const cancelSubscription = async (
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<Stripe.Subscription> => {
  if (cancelAtPeriodEnd) {
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  } else {
    return await stripe.subscriptions.cancel(subscriptionId);
  }
};