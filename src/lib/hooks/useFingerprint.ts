'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  getOrGenerateFingerprintId, 
  getFingerprintId, 
  setFingerprintId,
  createFingerprintHeaders
} from '@/lib/fingerprint';

interface AnonymousUser {
  userId: string;
  fingerprintId: string;
  status: string;
  createdAt: string;
}

interface Credits {
  balanceFree: number;
  balancePaid: number;
  totalBalance: number;
}

interface UseFingerprintResult {
  fingerprintId: string | null;
  anonymousUser: AnonymousUser | null;
  credits: Credits | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  initializeAnonymousUser: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

/**
 * Hook for managing fingerprint ID and anonymous user data
 */
export function useFingerprint(): UseFingerprintResult {
  const [fingerprintId, setFingerprintIdState] = useState<string | null>(null);
  const [anonymousUser, setAnonymousUser] = useState<AnonymousUser | null>(null);
  const [credits, setCredits] = useState<Credits | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 初始化fingerprint ID
   */
  const initializeFingerprintId = useCallback(() => {
    if (typeof window === 'undefined') return;

    const currentFingerprintId = getOrGenerateFingerprintId();
    setFingerprintIdState(currentFingerprintId);
    return currentFingerprintId;
  }, []);

  /**
   * 初始化匿名用户
   */
  const initializeAnonymousUser = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const fpId = fingerprintId || initializeFingerprintId();
      if (!fpId) {
        throw new Error('Failed to generate fingerprint ID');
      }

      const response = await fetch('/api/user/anonymous/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...createFingerprintHeaders(),
        },
        body: JSON.stringify({
          fingerprintId: fpId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to initialize anonymous user');
      }

      const data = await response.json();
      
      if (data.success) {
        setAnonymousUser(data.user);
        setCredits(data.credits);
        setIsInitialized(true);
        
        // 确保fingerprint ID同步
        if (data.user.fingerprintId !== fpId) {
          setFingerprintId(data.user.fingerprintId);
          setFingerprintIdState(data.user.fingerprintId);
        }
      } else {
        throw new Error(data.error || 'Unknown error occurred');
      }
    } catch (err) {
      console.error('Failed to initialize anonymous user:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [fingerprintId, initializeFingerprintId]);

  /**
   * 刷新用户数据
   */
  const refreshUserData = useCallback(async () => {
    if (!fingerprintId) return;

    try {
      setError(null);

      const response = await fetch(`/api/user/anonymous/init?fingerprintId=${fingerprintId}`, {
        method: 'GET',
        headers: createFingerprintHeaders(),
      });

      if (!response.ok) {
        if (response.status === 404) {
          // 用户不存在，需要重新初始化
          await initializeAnonymousUser();
          return;
        }
        throw new Error('Failed to fetch user data');
      }

      const data = await response.json();
      
      if (data.success) {
        setAnonymousUser(data.user);
        setCredits(data.credits);
      }
    } catch (err) {
      console.error('Failed to refresh user data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [fingerprintId, initializeAnonymousUser]);

  /**
   * 检查现有用户数据
   */
  const checkExistingUser = useCallback(async () => {
    const fpId = getFingerprintId();
    if (!fpId) {
      setIsLoading(false);
      return;
    }

    setFingerprintIdState(fpId);

    try {
      const response = await fetch(`/api/user/anonymous/init?fingerprintId=${fpId}`, {
        method: 'GET',
        headers: createFingerprintHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAnonymousUser(data.user);
          setCredits(data.credits);
          setIsInitialized(true);
        }
      }
    } catch (err) {
      console.error('Failed to check existing user:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 初始化效果
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 首先检查是否有现有用户数据
    checkExistingUser();
  }, [checkExistingUser]);

  // 如果没有初始化且不在加载中，自动初始化
  useEffect(() => {
    if (!isInitialized && !isLoading && !error && fingerprintId) {
      initializeAnonymousUser();
    }
  }, [isInitialized, isLoading, error, fingerprintId, initializeAnonymousUser]);

  return {
    fingerprintId,
    anonymousUser,
    credits,
    isLoading,
    isInitialized,
    error,
    initializeAnonymousUser,
    refreshUserData,
  };
}

/**
 * 创建包含fingerprint的fetch wrapper
 */
export function createFingerprintFetch() {
  return (url: string | URL | Request, init?: RequestInit) => {
    const headers = {
      ...createFingerprintHeaders(),
      ...(init?.headers || {}),
    };

    return fetch(url, {
      ...init,
      headers,
    });
  };
}