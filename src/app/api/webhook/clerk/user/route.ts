import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { Webhook } from 'svix';
import { userService, creditService, creditUsageService, Apilogger } from '@/services/database';
import { UserStatus, CreditType, OperationType } from '@/services/database';

// 定义Clerk Webhook事件类型
interface ClerkWebhookEvent {
  data: {
    id: string;
    email_addresses?: Array<{
      email_address: string;
    }>;
    unsafe_metadata?: {
      user_id?: string;
      fingerprint_id?: string;
    };
    deleted?: boolean;
    object?: string;
  };
  event_attributes?: {
    http_request?: {
      client_ip?: string;
      user_agent?: string;
    };
  };
  instance_id?: string;
  object: string;
  timestamp: number;
  type: 'user.created' | 'user.deleted';
}

// 免费积分配置
const FREE_CREDITS_AMOUNT = 50;

export async function POST(request: NextRequest) {
  try {
    // 获取webhook签名验证所需的headers
    const headerPayload = await headers();
    const svix_id = headerPayload.get('svix-id');
    const svix_timestamp = headerPayload.get('svix-timestamp');
    const svix_signature = headerPayload.get('svix-signature');

    // 如果缺少必要的header，返回错误
    if (!svix_id || !svix_timestamp || !svix_signature) {
      return NextResponse.json(
        { error: 'Missing webhook headers' },
        { status: 400 }
      );
    }

    // 获取原始请求体
    const rawBody = await request.text();

    // 获取webhook signing secret
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('CLERK_WEBHOOK_SECRET is not configured');
      return NextResponse.json(
        { error: 'Webhook configuration error' },
        { status: 500 }
      );
    }

    // 验证webhook签名
    let event: ClerkWebhookEvent;
    try {
      const wh = new Webhook(webhookSecret);
      event = wh.verify(rawBody, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      }) as ClerkWebhookEvent;
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    // Log the incoming webhook
    Apilogger.logClerkIncoming(`webhook.${event.type}`, {
      event_type: event.type,
      clerk_user_id: event.data.id,
      email: event.data.email_addresses?.[0]?.email_address,
      fingerprint_id: event.data.unsafe_metadata?.fingerprint_id
    });

    // 处理不同的事件类型
    const { type } = event;

    switch (type) {
      case 'user.created':
        await handleUserCreated(event);
        break;
      case 'user.deleted':
        await handleUserDeleted(event);
        break;
      default:
        console.log(`Unhandled event type: ${type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 处理用户创建事件
 */
async function handleUserCreated(event: ClerkWebhookEvent) {
  const { data } = event;
  const clerkUserId = data.id;
  const email = data.email_addresses?.[0]?.email_address;
  const unsafeMetadata = data.unsafe_metadata;
  const fingerprintId = unsafeMetadata?.fingerprint_id;

  console.log('Processing user.created event:', {
    clerkUserId,
    email,
    fingerprintId
  });

  // 检查必要参数
  if (!fingerprintId) {
    console.error('Missing fingerprintId in webhook data, process flow error');
    return;
  }

  if (!email) {
    console.error('Missing email in webhook data');
    return;
  }

  try {
    // 按fingerprintId查询该设备的所有用户记录
    const existingUsers = await userService.findListByFingerprintId(fingerprintId);

    // 查找email相同的记录
    const sameEmailUser = existingUsers.find(user => user.email === email);
    if (sameEmailUser) {
      // 同一账号，检查是否需要更新clerkUserId
      if (sameEmailUser.clerkUserId !== clerkUserId) {
        await userService.updateUser(sameEmailUser.userId, { clerkUserId });
        console.log(`Updated clerkUserId for user ${sameEmailUser.userId}`);
      } else {
        console.log(`User with email ${email} already exists, skipping duplicate message`);
      }
      return;
    }

    // 查找匿名用户（email为空且clerkUserId为空）
    const anonymousUser = existingUsers.find(user => 
      !user.email && !user.clerkUserId && user.status === UserStatus.ANONYMOUS
    );
    if (anonymousUser) {
      // 匿名用户升级
      await userService.upgradeToRegistered(anonymousUser.userId, {
        email,
        clerkUserId
      });
      console.log(`Successfully upgraded anonymous user ${anonymousUser.userId} to registered user`);
      return;
    }

    // 同设备新账号，创建新用户
    await createNewRegisteredUser(clerkUserId, email, fingerprintId);
    console.log(`Created new user for device ${fingerprintId} with email ${email}`);
    
  } catch (error) {
    console.error('Error handling user.created event:', error);
    throw error;
  }
}

/**
 * 处理用户删除事件
 */
async function handleUserDeleted(event: ClerkWebhookEvent) {
  const { data } = event;
  const clerkUserId = data.id;

  console.log('Processing user.deleted event:', { clerkUserId });

  try {
    // 根据clerkUserId查找用户
    const user = await userService.findByClerkUserId(clerkUserId);
    
    if (!user) {
      console.log(`User with clerkUserId ${clerkUserId} not found`);
      return;
    }

    // 备份用户数据并硬删除用户
    await userService.hardDeleteUser(user.userId);
    
    console.log(`Successfully deleted user ${user.userId} (clerkUserId: ${clerkUserId})`);
    
  } catch (error) {
    console.error('Error handling user.deleted event:', error);
    throw error;
  }
}

/**
 * 创建新的注册用户
 */
async function createNewRegisteredUser(
  clerkUserId: string, 
  email?: string, 
  fingerprintId?: string
) {
  // 创建新用户
  const newUser = await userService.createUser({
    clerkUserId,
    email,
    fingerprintId,
    status: UserStatus.REGISTERED
  });

  // 初始化积分记录
  await creditService.initializeCredit(
    newUser.userId,
    FREE_CREDITS_AMOUNT,
    0 // 注册时只给免费积分，付费积分为0
  );

  // 记录免费积分充值记录
  await creditUsageService.recordCreditOperation({
    userId: newUser.userId,
    feature: 'user_registration',
    creditType: CreditType.FREE,
    operationType: OperationType.RECHARGE,
    creditsUsed: FREE_CREDITS_AMOUNT
  });

  console.log(`Created new registered user ${newUser.userId} with ${FREE_CREDITS_AMOUNT} free credits`);
}