'use client';

import React from 'react';
import { useFingerprintContext } from '@/lib/context/FingerprintProvider';

/**
 * 显示当前用户的fingerprint状态和积分信息
 * 可以在任何页面使用来查看匿名用户状态
 */
export function FingerprintStatus() {
  const { 
    fingerprintId, 
    anonymousUser, 
    credits, 
    isLoading, 
    isInitialized,
    error,
    initializeAnonymousUser,
    refreshUserData 
  } = useFingerprintContext();

  if (isLoading) {
    return (
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-blue-700 dark:text-blue-300">正在初始化匿名用户...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">出现错误</h3>
        <p className="text-red-600 dark:text-red-300 text-sm mb-3">{error}</p>
        <button 
          onClick={initializeAnonymousUser}
          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
        >
          重试
        </button>
      </div>
    );
  }

  if (!isInitialized || !anonymousUser) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
        <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">未初始化</h3>
        <p className="text-yellow-600 dark:text-yellow-300 text-sm mb-3">
          fingerprint ID: {fingerprintId || '未生成'}
        </p>
        <button 
          onClick={initializeAnonymousUser}
          className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 transition-colors"
        >
          初始化匿名用户
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-green-800 dark:text-green-200">用户状态</h3>
        <button 
          onClick={refreshUserData}
          className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
        >
          刷新
        </button>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-green-700 dark:text-green-300">Fingerprint ID:</span>
          <code className="text-green-600 dark:text-green-400 text-xs font-mono">
            {fingerprintId?.slice(0, 16)}...
          </code>
        </div>
        
        <div className="flex justify-between">
          <span className="text-green-700 dark:text-green-300">用户 ID:</span>
          <code className="text-green-600 dark:text-green-400 text-xs font-mono">
            {anonymousUser.userId.slice(0, 8)}...
          </code>
        </div>
        
        <div className="flex justify-between">
          <span className="text-green-700 dark:text-green-300">状态:</span>
          <span className="text-green-600 dark:text-green-400">
            {anonymousUser.status === 'anonymous' ? '匿名用户' : anonymousUser.status}
          </span>
        </div>
        
        {credits && (
          <>
            <div className="flex justify-between">
              <span className="text-green-700 dark:text-green-300">免费积分:</span>
              <span className="text-green-600 dark:text-green-400 font-medium">
                {credits.balanceFree}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-green-700 dark:text-green-300">付费积分:</span>
              <span className="text-green-600 dark:text-green-400 font-medium">
                {credits.balancePaid}
              </span>
            </div>
            
            <div className="flex justify-between border-t border-green-200 dark:border-green-700 pt-2">
              <span className="text-green-700 dark:text-green-300 font-medium">总积分:</span>
              <span className="text-green-600 dark:text-green-400 font-bold">
                {credits.totalBalance}
              </span>
            </div>
          </>
        )}
        
        <div className="flex justify-between text-xs">
          <span className="text-green-600 dark:text-green-400">创建时间:</span>
          <span className="text-green-500 dark:text-green-500">
            {new Date(anonymousUser.createdAt).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}