import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { 
  createCheckoutSession, 
  createOrGetCustomer, 
  getPriceConfig 
} from '@/lib/stripe-config';
import { 
  userService, 
  transactionService, 
  TransactionType,
  OrderStatus,
  PaySupplier 
} from '@/services/database';
import { ApiAuthUtils } from '@/lib/auth-utils';

// Request validation schema - 使用统一认证后大大简化了用户识别
const createSubscriptionSchema = z.object({
  priceId: z.string().min(1, 'Price ID is required'),
  successUrl: z.string().url('Invalid success URL').optional(),
  cancelUrl: z.string().url('Invalid cancel URL').optional(),
});

export async function POST(request: NextRequest) {
  try {
    // 使用统一的认证工具获取用户ID - 一行代码搞定所有认证逻辑！
    const authUtils = new ApiAuthUtils(request);
    const userId = authUtils.requireAuth(); // 自动处理三种ID关系，未认证会抛出错误
    // Parse request body
    const body = await request.json();
    const { priceId, successUrl, cancelUrl } = createSubscriptionSchema.parse(body);

    
    // 根据用户ID查询用户信息
    const user = await userService.findByUserId(userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Validate price configuration
    const priceConfig = getPriceConfig(priceId);
    if (!priceConfig) {
      return NextResponse.json(
        { error: 'Invalid price ID' },
        { status: 400 }
      );
    }

    // Create or get Stripe customer
    const customer = await createOrGetCustomer({
      email: user.email || undefined,
      userId: user.userId,
      name: user.email ? user.email.split('@')[0] : undefined,
    });

    // Generate order ID
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(2)}`;

    // Default URLs if not provided
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const defaultSuccessUrl = `${baseUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`;
    const defaultCancelUrl = `${baseUrl}/pricing`;

    // Create Stripe checkout session
    const session = await createCheckoutSession({
      priceId,
      customerId: customer.id,
      clientReferenceId: user.userId,
      successUrl: successUrl || defaultSuccessUrl,
      cancelUrl: cancelUrl || defaultCancelUrl,
      metadata: {
        order_id: orderId,
        user_id: user.userId,
        price_name: priceConfig.priceName,
        credits_granted: priceConfig.credits.toString(),
      },
    });

    // Create transaction record with session info
    const _transaction = await transactionService.createTransaction({
      userId: user.userId,
      orderId,
      orderStatus: OrderStatus.CREATED,
      paySupplier: PaySupplier.STRIPE,
      paySessionId: session.id,
      payCreatedAt: new Date(),
      priceId,
      priceName: priceConfig.priceName,
      amount: priceConfig.amount,
      currency: priceConfig.currency,
      type: priceConfig.interval ? TransactionType.SUBSCRIPTION : TransactionType.ONE_TIME,
      creditsGranted: priceConfig.credits,
      orderDetail: priceConfig.description,
    });

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.id,
        sessionUrl: session.url,
        orderId,
        priceConfig: {
          priceName: priceConfig.priceName,
          amount: priceConfig.amount,
          currency: priceConfig.currency,
          credits: priceConfig.credits,
          description: priceConfig.description,
        },
      },
    });

  } catch (error) {
    console.error('Create subscription error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}

// GET method to retrieve available plans
export async function GET() {
  try {
    // Return available subscription plans
    const plans = [
      {
        id: 'basic',
        name: '基础版',
        priceId: process.env.STRIPE_PRICE_BASIC_MONTHLY,
        amount: 70,
        currency: 'CNY',
        interval: 'month',
        credits: 100,
        description: '基础版计划 - 每月100积分',
        features: [
          '每月100积分',
          '基础API访问',
          '邮件支持',
        ],
      },
      {
        id: 'pro',
        name: '专业版', 
        priceId: process.env.STRIPE_PRICE_PRO_MONTHLY,
        amount: 140,
        currency: 'CNY',
        interval: 'month',
        credits: 250,
        description: '专业版计划 - 每月250积分',
        features: [
          '每月250积分',
          '高级API访问',
          '优先支持',
          '使用分析',
        ],
      },
      {
        id: 'enterprise',
        name: '企业版',
        priceId: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
        amount: 350,
        currency: 'CNY',
        interval: 'month', 
        credits: 1000,
        description: '企业版计划 - 每月1000积分',
        features: [
          '每月1000积分',
          '完整API访问',
          '24/7专属支持',
          '高级分析',
          '自定义集成',
        ],
      },
    ];

    const creditPacks = [
      {
        id: 'credits_100',
        name: '100积分包',
        priceId: process.env.STRIPE_PRICE_CREDITS_100,
        amount: 35,
        currency: 'CNY',
        credits: 100,
        description: '一次性购买100积分',
      },
      {
        id: 'credits_500', 
        name: '500积分包',
        priceId: process.env.STRIPE_PRICE_CREDITS_500,
        amount: 150,
        currency: 'CNY', 
        credits: 500,
        description: '一次性购买500积分',
      },
    ];

    return NextResponse.json({
      success: true,
      data: {
        subscriptionPlans: plans,
        creditPacks,
      },
    });

  } catch (error) {
    console.error('Get subscription plans error:', error);
    return NextResponse.json(
      { error: 'Failed to get subscription plans' },
      { status: 500 }
    );
  }
}