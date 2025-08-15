import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { ClerkMiddlewareAuth } from '@clerk/nextjs/server';
import { extractFingerprintFromNextRequest } from '@windrun-huaiin/third-ui/fingerprint/server';
import { userService, UserStatus } from '@/services/database';

// ==================== 常量定义 ====================

/** 认证相关的请求头字段名 */
export const AUTH_HEADERS = {
  USER_ID: 'x-user-id',
  USER_AUTHENTICATED: 'x-user-authenticated', 
  USER_REGISTERED: 'x-user-registered',
  USER_STATUS: 'x-user-status',
  FINGERPRINT_ID: 'x-fingerprint-id',
  CLERK_USER_ID: 'x-clerk-user-id',
  USER_EMAIL: 'x-user-email',
} as const;

/** 认证上下文类型 */
export interface AuthContext {
  userId: string | null;
  isAuthenticated: boolean;
  isRegistered: boolean;
  fingerprintId: string | null;
  clerkUserId: string | null;
  email: string | null;
  status?: string;
}

/** 中间件认证结果类型 */
export interface MiddlewareAuthResult {
  userId: string | null;
  shouldRedirect: boolean;
  authContext?: AuthContext;
}

// ==================== 核心认证逻辑 ====================

/**
 * 核心身份认证处理逻辑
 * 统一处理三种ID的关系: clerk_user_id -> fingerprint_id -> user_id
 */
export async function handleUserAuth(
  auth: ClerkMiddlewareAuth,
  req: NextRequest
): Promise<MiddlewareAuthResult> {
  try {
    // 1. 首先尝试从Clerk获取已登录用户
    const { userId: clerkUserId } = await auth();
    
    if (clerkUserId) {
      // 用户已登录，根据clerk_user_id查询系统内的user_id
      const user = await userService.findByClerkUserId(clerkUserId);
      if (user) {
        const authContext = await buildAuthContext(auth, req, user.userId);
        console.log('Authenticated user found:', { clerkUserId, userId: user.userId });
        return { 
          userId: user.userId, 
          shouldRedirect: false,
          authContext
        };
      } else {
        // 这是异常情况：Clerk有用户但数据库没有对应记录
        console.warn('Clerk user exists but no database record:', clerkUserId);
        return { userId: null, shouldRedirect: true };
      }
    }

    // 2. 用户未登录，检查fingerprint_id
    const fingerprintId = extractFingerprintFromNextRequest(req);
    if (!fingerprintId) {
      // 没有fingerprint_id，无法识别用户
      return { userId: null, shouldRedirect: true };
    }

    // 3. 根据fingerprint_id查询用户记录
    const existingUsers = await userService.findListByFingerprintId(fingerprintId);
    
    if (existingUsers.length === 0) {
      // 该fingerprint_id没有任何用户记录，说明是全新用户
      console.log('New user with fingerprint:', fingerprintId);
      return { userId: null, shouldRedirect: true };
    }

    // 4. 分析用户记录情况
    const registeredUsers = existingUsers.filter(u => u.status === UserStatus.REGISTERED);
    const anonymousUsers = existingUsers.filter(u => u.status === UserStatus.ANONYMOUS);

    if (registeredUsers.length > 0) {
      // 情况一：用户注册过但没登录，需要登录
      console.log('Registered user not logged in, redirecting to sign-in');
      return { userId: null, shouldRedirect: true };
    } else if (anonymousUsers.length > 0) {
      // 情况二：只有匿名用户记录，使用匿名用户的user_id
      const anonymousUser = anonymousUsers[0]; // 取最新的匿名用户
      const authContext = await buildAuthContext(auth, req, anonymousUser.userId);
      console.log('Anonymous user found:', { fingerprintId, userId: anonymousUser.userId });
      return { 
        userId: anonymousUser.userId, 
        shouldRedirect: false,
        authContext
      };
    } else {
      // 异常情况：有用户记录但状态异常
      console.warn('Unusual user status for fingerprint:', fingerprintId);
      return { userId: null, shouldRedirect: true };
    }

  } catch (error) {
    console.error('Error in user auth handling:', error);
    return { userId: null, shouldRedirect: false };
  }
}

/**
 * 构建认证上下文信息
 */
export async function buildAuthContext(
  auth: ClerkMiddlewareAuth,
  req: NextRequest,
  userId: string
): Promise<AuthContext> {
  try {
    const { userId: clerkUserId } = await auth();
    const fingerprintId = extractFingerprintFromNextRequest(req);
    
    // 获取用户完整信息
    const user = await userService.findById(userId);
    
    return {
      userId,
      isAuthenticated: true,
      isRegistered: !!user?.email && !!user?.clerkUserId,
      fingerprintId,
      clerkUserId,
      email: user?.email || null,
      status: user?.status || 'unknown',
    };
  } catch (error) {
    console.error('Error building auth context:', error);
    return {
      userId,
      isAuthenticated: true,
      isRegistered: false,
      fingerprintId: null,
      clerkUserId: null,
      email: null,
      status: 'unknown',
    };
  }
}

/**
 * 设置认证相关的响应头
 */
export function setAuthHeaders(response: NextResponse, authContext: AuthContext): void {
  response.headers.set(AUTH_HEADERS.USER_ID, authContext.userId || '');
  response.headers.set(AUTH_HEADERS.USER_AUTHENTICATED, authContext.isAuthenticated.toString());
  response.headers.set(AUTH_HEADERS.USER_REGISTERED, authContext.isRegistered.toString());
  response.headers.set(AUTH_HEADERS.USER_STATUS, authContext.status || 'unknown');
  
  if (authContext.fingerprintId) {
    response.headers.set(AUTH_HEADERS.FINGERPRINT_ID, authContext.fingerprintId);
  }
  
  if (authContext.clerkUserId) {
    response.headers.set(AUTH_HEADERS.CLERK_USER_ID, authContext.clerkUserId);
  }
  
  if (authContext.email) {
    response.headers.set(AUTH_HEADERS.USER_EMAIL, authContext.email);
  }
}

// ==================== API使用工具函数 ====================

/**
 * 从中间件设置的请求头中获取用户ID
 * 这是后端API的统一入口，不需要关心三种ID的复杂关系
 */
export async function getUserIdFromHeaders(): Promise<string | null> {
  try {
    const headersList = await headers();
    return headersList.get(AUTH_HEADERS.USER_ID);
  } catch (error) {
    console.error('Error getting user ID from headers:', error);
    return null;
  }
}

/**
 * 从NextRequest中获取用户ID（用于API Route处理函数）
 */
export function getUserIdFromRequest(req: NextRequest): string | null {
  return req.headers.get(AUTH_HEADERS.USER_ID);
}

/**
 * 验证用户是否已认证
 */
export async function isAuthenticated(): Promise<boolean> {
  const userId = await getUserIdFromHeaders();
  return !!userId;
}

/**
 * 要求用户必须已认证，否则抛出错误
 */
export async function requireAuth(): Promise<string> {
  const userId = await getUserIdFromHeaders();
  if (!userId) {
    throw new Error('Authentication required');
  }
  return userId;
}

/**
 * 获取用户认证信息（包括其他有用的头信息）
 */
export async function getAuthContext(): Promise<AuthContext> {
  try {
    const headersList = await headers();
    
    const userId = headersList.get(AUTH_HEADERS.USER_ID);
    const isAuthenticated = headersList.get(AUTH_HEADERS.USER_AUTHENTICATED) === 'true';
    const isRegistered = headersList.get(AUTH_HEADERS.USER_REGISTERED) === 'true';
    const fingerprintId = headersList.get(AUTH_HEADERS.FINGERPRINT_ID);
    const clerkUserId = headersList.get(AUTH_HEADERS.CLERK_USER_ID);
    const email = headersList.get(AUTH_HEADERS.USER_EMAIL);
    const status = headersList.get(AUTH_HEADERS.USER_STATUS) || undefined;

    return {
      userId,
      isAuthenticated,
      isRegistered,
      fingerprintId,
      clerkUserId,
      email,
      status,
    };
  } catch (error) {
    console.error('Error getting auth context:', error);
    return {
      userId: null,
      isAuthenticated: false,
      isRegistered: false,
      fingerprintId: null,
      clerkUserId: null,
      email: null,
      status: 'unknown',
    };
  }
}

/**
 * API Route版本的认证工具函数
 */
export class ApiAuthUtils {
  private req: NextRequest;

  constructor(req: NextRequest) {
    this.req = req;
  }

  /**
   * 获取用户ID
   */
  getUserId(): string | null {
    return this.req.headers.get(AUTH_HEADERS.USER_ID);
  }

  /**
   * 要求用户必须已认证
   */
  requireAuth(): string {
    const userId = this.getUserId();
    if (!userId) {
      throw new Error('Authentication required');
    }
    return userId;
  }

  /**
   * 检查是否已认证
   */
  isAuthenticated(): boolean {
    return !!this.getUserId();
  }

  /**
   * 获取完整认证上下文
   */
  getAuthContext(): AuthContext {
    const userId = this.req.headers.get(AUTH_HEADERS.USER_ID);
    const isAuthenticated = this.req.headers.get(AUTH_HEADERS.USER_AUTHENTICATED) === 'true';
    const isRegistered = this.req.headers.get(AUTH_HEADERS.USER_REGISTERED) === 'true';
    const fingerprintId = this.req.headers.get(AUTH_HEADERS.FINGERPRINT_ID);
    const clerkUserId = this.req.headers.get(AUTH_HEADERS.CLERK_USER_ID);
    const email = this.req.headers.get(AUTH_HEADERS.USER_EMAIL);
    const status = this.req.headers.get(AUTH_HEADERS.USER_STATUS) || undefined;

    return {
      userId,
      isAuthenticated,
      isRegistered,
      fingerprintId,
      clerkUserId,
      email,
      status,
    };
  }
}