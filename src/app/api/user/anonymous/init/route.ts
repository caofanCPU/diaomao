import { NextRequest, NextResponse } from 'next/server';
import { userService, creditService, creditUsageService } from '@/services/database';
import { UserStatus, CreditType, OperationType } from '@/services/database';
import { extractFingerprintId, isValidFingerprintId } from '@/lib/fingerprint';

// 免费积分配置
const FREE_CREDITS_AMOUNT = 50;

/**
 * 匿名用户初始化API
 * POST /api/user/anonymous/init
 */
export async function POST(request: NextRequest) {
  try {
    // 获取请求体
    const body = await request.json().catch(() => ({}));
    const { fingerprintId: bodyFingerprintId } = body;

    // 从请求中提取fingerprint ID
    const headers = Object.fromEntries(request.headers.entries());
    const cookies = request.cookies.getAll().reduce((acc, cookie) => {
      acc[cookie.name] = cookie.value;
      return acc;
    }, {} as Record<string, string>);
    
    const extractedFingerprintId = extractFingerprintId(headers, cookies);
    
    // 优先使用提取的fingerprint ID，如果没有则使用请求体中的
    const fingerprintId = extractedFingerprintId || bodyFingerprintId;

    // 验证fingerprint ID
    if (!fingerprintId || !isValidFingerprintId(fingerprintId)) {
      return NextResponse.json(
        { error: 'Invalid or missing fingerprint ID' },
        { status: 400 }
      );
    }

    // 检查是否已存在该fingerprint的用户
    const existingUser = await userService.findByFingerprintId(fingerprintId);
    
    if (existingUser) {
      // 用户已存在，返回现有用户信息
      const credits = await creditService.getCredits(existingUser.userId);
      
      return NextResponse.json({
        success: true,
        user: {
          userId: existingUser.userId,
          fingerprintId: existingUser.fingerprintId,
          status: existingUser.status,
          createdAt: existingUser.createdAt,
        },
        credits: credits ? {
          balanceFree: credits.balanceFree,
          balancePaid: credits.balancePaid,
          totalBalance: credits.balanceFree + credits.balancePaid,
        } : null,
        isNewUser: false,
      });
    }

    // 创建新的匿名用户
    const newUser = await userService.createUser({
      fingerprintId,
      status: UserStatus.ANONYMOUS,
    });

    // 初始化积分记录
    const credits = await creditService.initializeCredits(
      newUser.userId,
      FREE_CREDITS_AMOUNT,
      0 // 匿名用户只给免费积分
    );

    // 记录免费积分充值记录
    await creditUsageService.recordCreditOperation({
      userId: newUser.userId,
      feature: 'anonymous_user_init',
      creditType: CreditType.FREE,
      operationType: OperationType.RECHARGE,
      creditsUsed: FREE_CREDITS_AMOUNT,
    });

    console.log(`Created new anonymous user ${newUser.userId} with fingerprint ${fingerprintId}`);

    // 返回创建结果
    return NextResponse.json({
      success: true,
      user: {
        userId: newUser.userId,
        fingerprintId: newUser.fingerprintId,
        status: newUser.status,
        createdAt: newUser.createdAt,
      },
      credits: {
        balanceFree: credits.balanceFree,
        balancePaid: credits.balancePaid,
        totalBalance: credits.balanceFree + credits.balancePaid,
      },
      isNewUser: true,
    });

  } catch (error) {
    console.error('Anonymous user initialization error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * 获取匿名用户信息
 * GET /api/user/anonymous/init?fingerprintId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryFingerprintId = searchParams.get('fingerprintId');

    // 从请求中提取fingerprint ID
    const headers = Object.fromEntries(request.headers.entries());
    const cookies = request.cookies.getAll().reduce((acc, cookie) => {
      acc[cookie.name] = cookie.value;
      return acc;
    }, {} as Record<string, string>);
    
    const extractedFingerprintId = extractFingerprintId(headers, cookies, { fingerprintId: queryFingerprintId || undefined });
    
    if (!extractedFingerprintId || !isValidFingerprintId(extractedFingerprintId)) {
      return NextResponse.json(
        { error: 'Invalid or missing fingerprint ID' },
        { status: 400 }
      );
    }

    // 查找用户
    const user = await userService.findByFingerprintId(extractedFingerprintId);
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // 获取积分信息
    const credits = await creditService.getCredits(user.userId);

    return NextResponse.json({
      success: true,
      user: {
        userId: user.userId,
        fingerprintId: user.fingerprintId,
        email: user.email,
        status: user.status,
        createdAt: user.createdAt,
      },
      credits: credits ? {
        balanceFree: credits.balanceFree,
        balancePaid: credits.balancePaid,
        totalBalance: credits.balanceFree + credits.balancePaid,
      } : null,
    });

  } catch (error) {
    console.error('Get anonymous user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}