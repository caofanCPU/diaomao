/**
 * Fingerprint ID Generator and Manager
 * 基于浏览器特征生成唯一的设备指纹ID，用于匿名用户识别
 */

import { v4 as uuidv4 } from 'uuid';

// Fingerprint ID的存储键
const FINGERPRINT_STORAGE_KEY = 'diaomao_fingerprint_id';
const FINGERPRINT_HEADER_NAME = 'x-fingerprint-id';
const FINGERPRINT_COOKIE_NAME = 'fingerprint_id';

/**
 * 生成基于浏览器特征的fingerprint ID
 * 在客户端使用，结合多种浏览器特征生成唯一标识
 */
export function generateFingerprintId(): string {
  // 如果在浏览器环境中，尝试使用现有的fingerprint ID
  if (typeof window !== 'undefined') {
    // 首先检查localStorage
    const existingId = localStorage.getItem(FINGERPRINT_STORAGE_KEY);
    if (existingId) {
      return existingId;
    }

    // 检查cookie
    const cookieId = getCookieValue(FINGERPRINT_COOKIE_NAME);
    if (cookieId) {
      // 同步到localStorage
      localStorage.setItem(FINGERPRINT_STORAGE_KEY, cookieId);
      return cookieId;
    }
  }

  // 生成新的fingerprint ID
  const fingerprintId = `fp_${uuidv4().replace(/-/g, '')}`;

  // 在浏览器环境中存储
  if (typeof window !== 'undefined') {
    localStorage.setItem(FINGERPRINT_STORAGE_KEY, fingerprintId);
    setCookie(FINGERPRINT_COOKIE_NAME, fingerprintId, 365); // 365天过期
  }

  return fingerprintId;
}

/**
 * 获取当前的fingerprint ID
 */
export function getFingerprintId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  // 首先检查localStorage
  const localStorageId = localStorage.getItem(FINGERPRINT_STORAGE_KEY);
  if (localStorageId) {
    return localStorageId;
  }

  // 检查cookie
  const cookieId = getCookieValue(FINGERPRINT_COOKIE_NAME);
  if (cookieId) {
    // 同步到localStorage
    localStorage.setItem(FINGERPRINT_STORAGE_KEY, cookieId);
    return cookieId;
  }

  return null;
}

/**
 * 设置fingerprint ID到存储
 */
export function setFingerprintId(fingerprintId: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(FINGERPRINT_STORAGE_KEY, fingerprintId);
  setCookie(FINGERPRINT_COOKIE_NAME, fingerprintId, 365);
}

/**
 * 清除fingerprint ID
 */
export function clearFingerprintId(): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(FINGERPRINT_STORAGE_KEY);
  deleteCookie(FINGERPRINT_COOKIE_NAME);
}

/**
 * 获取或生成fingerprint ID
 * 如果不存在则自动生成新的
 */
export function getOrGenerateFingerprintId(): string {
  const existingId = getFingerprintId();
  if (existingId) {
    return existingId;
  }
  return generateFingerprintId();
}

/**
 * 验证fingerprint ID格式
 */
export function isValidFingerprintId(fingerprintId: string): boolean {
  if (!fingerprintId) return false;
  // 检查格式：fp_ + 32位十六进制字符
  return /^fp_[a-f0-9]{32}$/.test(fingerprintId);
}

/**
 * 创建包含fingerprint ID的fetch headers
 */
export function createFingerprintHeaders(): Record<string, string> {
  const fingerprintId = getOrGenerateFingerprintId();
  return {
    [FINGERPRINT_HEADER_NAME]: fingerprintId,
  };
}

/**
 * 从请求中提取fingerprint ID
 * 优先级：header > cookie > query参数
 */
export function extractFingerprintId(
  headers: Headers | Record<string, string>,
  cookies?: Record<string, string>,
  query?: Record<string, string | undefined>
): string | null {
  // 1. 从header中获取
  const headerValue = headers instanceof Headers 
    ? headers.get(FINGERPRINT_HEADER_NAME)
    : headers[FINGERPRINT_HEADER_NAME];
  
  if (headerValue && isValidFingerprintId(headerValue)) {
    return headerValue;
  }

  // 2. 从cookie中获取
  if (cookies) {
    const cookieValue = cookies[FINGERPRINT_COOKIE_NAME];
    if (cookieValue && isValidFingerprintId(cookieValue)) {
      return cookieValue;
    }
  }

  // 3. 从query参数中获取
  if (query) {
    const queryValue = query.fingerprint_id || query.fp_id;
    if (queryValue && isValidFingerprintId(queryValue)) {
      return queryValue;
    }
  }

  return null;
}

// Cookie 辅助函数
function getCookieValue(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

function setCookie(name: string, value: string, days: number): void {
  if (typeof document === 'undefined') {
    return;
  }

  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

function deleteCookie(name: string): void {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}

// 常量导出
export const FINGERPRINT_CONSTANTS = {
  STORAGE_KEY: FINGERPRINT_STORAGE_KEY,
  HEADER_NAME: FINGERPRINT_HEADER_NAME,
  COOKIE_NAME: FINGERPRINT_COOKIE_NAME,
} as const;