/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server';
import { userService, creditService, creditUsageService, User, Credit } from '@/services/database';
import { UserStatus, CreditType, OperationType } from '@/services/database';
import { extractFingerprintFromNextRequest } from '@windrun-huaiin/third-ui/fingerprint/server';
import { AnonymousUser, Credits } from '@windrun-huaiin/third-ui/fingerprint';

// 免费积分配置
const FREE_CREDITS_AMOUNT = 50;

// ==================== 类型定义 ====================

/** 成功响应数据 */
interface AnonymousUserResponse {
  success: true;
  user: AnonymousUser;
  credits: Credits | null;
  isNewUser: boolean;
  totalUsersOnDevice?: number;
  hasAnonymousUser?: boolean;
}

/** 错误响应数据 */
interface ErrorResponse {
  error: string;
}

// ==================== 工具函数 ====================

/** 创建用户信息对象 */
function createUserInfo(user: User): AnonymousUser {
  return {
    userId: user.userId,
    fingerprintId: user.fingerprintId || '',
    clerkUserId: user.clerkUserId || '',
    email: user.email || '',
    status: user.status,
    createdAt: user.createdAt?.toISOString() || '',
  };
}

/** 创建积分信息对象 */
function createCreditsInfo(credits: Credit): Credits {
  return {
    balanceFree: credits.balanceFree,
    balancePaid: credits.balancePaid,
    totalBalance: credits.balanceFree + credits.balancePaid,
  };
}

/** 创建成功响应对象 */
function createSuccessResponse(
  user: User,
  credits: Credit | null,
  isNewUser: boolean,
  options: {
    totalUsersOnDevice?: number;
    hasAnonymousUser?: boolean;
  } = {}
): AnonymousUserResponse {
  return {
    success: true,
    user: createUserInfo(user),
    credits: credits ? createCreditsInfo(credits) : null,
    isNewUser,
    ...options,
  };
}

/** 创建错误响应 */
function createErrorResponse(message: string, status = 400): NextResponse {
  const errorResponse: ErrorResponse = { error: message };
  return NextResponse.json(errorResponse, { status });
}

/**
 * 根据fingerprint_id查询用户并返回响应数据
 * 共用逻辑：优先返回匿名用户，只有匿名用户才返回积分数据
 */
async function getUserByFingerprintId(fingerprintId: string): Promise<AnonymousUserResponse | null> {
  const existingUsers = await userService.findListByFingerprintId(fingerprintId);
  
  if (existingUsers.length === 0) {
    return null;
  }

  // 查找最新的匿名用户
  const anonymousUsers = existingUsers.filter(u => u.status === UserStatus.ANONYMOUS);
  const latestAnonymousUser = anonymousUsers.length > 0 ? anonymousUsers[0] : null;
  
  if (latestAnonymousUser) {
    // 找到匿名用户，返回匿名用户信息和积分
    const credits = await creditService.getCredits(latestAnonymousUser.userId);
    
    return createSuccessResponse(
      latestAnonymousUser,
      credits,
      false,
      {
        totalUsersOnDevice: existingUsers.length,
        hasAnonymousUser: true,
      }
    );
  } else {
    // 没有匿名用户，说明该设备用户都已注册，不返回积分数据
    const latestUser = existingUsers[0];
    
    return createSuccessResponse(
      latestUser,
      null, // 注册用户不返回积分数据
      false,
      {
        totalUsersOnDevice: existingUsers.length,
        hasAnonymousUser: false,
      }
    );
  }
}

/**
 * 通用的fingerprint处理逻辑
 */
async function handleFingerprintRequest(request: NextRequest, options: { createIfNotExists?: boolean; } = {}) {
  try {
    // 从请求中提取fingerprint ID
    const fingerprintId = extractFingerprintFromNextRequest(request);

    // 验证fingerprint ID
    if (!fingerprintId) {
      return createErrorResponse('Invalid or missing fingerprint ID');
    }

    // 检查是否已存在该fingerprint的用户
    const existingUserResult = await getUserByFingerprintId(fingerprintId);
    
    if (existingUserResult) {
      return NextResponse.json(existingUserResult);
    }

    // 如果不存在用户且不允许创建，返回404
    if (!options.createIfNotExists) {
      return createErrorResponse('User not found', 404);
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
    const response = createSuccessResponse(newUser, credits, true);
    return NextResponse.json(response);

  } catch (error) {
    console.error('Fingerprint request error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

/**
 * 匿名用户初始化API
 * POST /api/user/anonymous/init
 */
export async function POST(request: NextRequest) {
  return handleFingerprintRequest(request, { createIfNotExists: true });
}

/**
 * 获取匿名用户信息
 * GET /api/user/anonymous/init?fingerprintId=xxx
 */
export async function GET(request: NextRequest) {
  return handleFingerprintRequest(request);
}