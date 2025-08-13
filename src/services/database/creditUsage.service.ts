/* eslint-disable @typescript-eslint/no-explicit-any */

import { PrismaClient, Prisma } from '@prisma/client';
import type { CreditUsage } from '@prisma/client';
import { CreditType, OperationType } from '@/db/constants';

const prisma = new PrismaClient();

export class CreditUsageService {
  // 记录积分使用
  async recordUsage(data: {
    userId: string;
    feature?: string;
    orderId?: string;
    creditType: string;
    operationType: string;
    creditsUsed: number;
  }): Promise<CreditUsage> {
    return await prisma.creditUsage.create({
      data: {
        userId: data.userId,
        feature: data.feature,
        orderId: data.orderId,
        creditType: data.creditType,
        operationType: data.operationType,
        creditsUsed: data.creditsUsed,
      },
    });
  }

  // 批量记录积分使用
  async recordBatchUsage(
    usages: Prisma.CreditUsageCreateManyInput[]
  ): Promise<number> {
    const result = await prisma.creditUsage.createMany({
      data: usages,
    });
    return result.count;
  }

  // 获取用户积分使用历史
  async getUserUsageHistory(
    userId: string,
    params?: {
      creditType?: string;
      operationType?: string;
      feature?: string;
      startDate?: Date;
      endDate?: Date;
      skip?: number;
      take?: number;
      orderBy?: Prisma.CreditUsageOrderByWithRelationInput;
    }
  ): Promise<{ usage: CreditUsage[]; total: number }> {
    const where: Prisma.CreditUsageWhereInput = { userId };

    if (params?.creditType) {
      where.creditType = params.creditType;
    }

    if (params?.operationType) {
      where.operationType = params.operationType;
    }

    if (params?.feature) {
      where.feature = params.feature;
    }

    if (params?.startDate || params?.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = params.startDate;
      if (params.endDate) where.createdAt.lte = params.endDate;
    }

    const [usage, total] = await Promise.all([
      prisma.creditUsage.findMany({
        where,
        skip: params?.skip || 0,
        take: params?.take || 20,
        orderBy: params?.orderBy || { createdAt: 'desc' },
      }),
      prisma.creditUsage.count({ where }),
    ]);

    return { usage, total };
  }

  // 获取订单相关的积分使用记录
  async getOrderUsage(orderId: string): Promise<CreditUsage[]> {
    return await prisma.creditUsage.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 获取用户积分使用统计
  async getUserUsageStats(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalConsumed: number;
    totalRecharged: number;
    freeConsumed: number;
    paidConsumed: number;
    freeRecharged: number;
    paidRecharged: number;
    featureUsage: { feature: string; credits: number }[];
  }> {
    const where: Prisma.CreditUsageWhereInput = { userId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    // 获取所有使用记录
    const allUsage = await prisma.creditUsage.findMany({
      where,
      select: {
        creditType: true,
        operationType: true,
        creditsUsed: true,
        feature: true,
      },
    });

    // 计算统计数据
    const stats = {
      totalConsumed: 0,
      totalRecharged: 0,
      freeConsumed: 0,
      paidConsumed: 0,
      freeRecharged: 0,
      paidRecharged: 0,
      featureUsage: [] as any[],
    };

    // 按功能统计使用量
    const featureMap = new Map<string, number>();

    allUsage.forEach((usage) => {
      if (usage.operationType === OperationType.CONSUME) {
        stats.totalConsumed += usage.creditsUsed;
        if (usage.creditType === CreditType.FREE) {
          stats.freeConsumed += usage.creditsUsed;
        } else {
          stats.paidConsumed += usage.creditsUsed;
        }

        if (usage.feature) {
          featureMap.set(
            usage.feature,
            (featureMap.get(usage.feature) || 0) + usage.creditsUsed
          );
        }
      } else if (usage.operationType === OperationType.RECHARGE) {
        stats.totalRecharged += usage.creditsUsed;
        if (usage.creditType === CreditType.FREE) {
          stats.freeRecharged += usage.creditsUsed;
        } else {
          stats.paidRecharged += usage.creditsUsed;
        }
      }
    });

    // 转换功能使用统计为数组
    stats.featureUsage = Array.from(featureMap.entries())
      .map(([feature, credits]) => ({ feature, credits }))
      .sort((a, b) => b.credits - a.credits);

    return stats;
  }

  // 获取热门功能使用统计
  async getPopularFeatures(
    limit: number = 10,
    startDate?: Date,
    endDate?: Date
  ): Promise<{ feature: string | null; totalCredits: number; usageCount: number }[]> {
    const where: Prisma.CreditUsageWhereInput = {
      operationType: OperationType.CONSUME,
      feature: { not: null },
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const result = await prisma.creditUsage.groupBy({
      by: ['feature'],
      where,
      _sum: {
        creditsUsed: true,
      },
      _count: true,
      orderBy: {
        _sum: {
          creditsUsed: 'desc',
        },
      },
      take: limit,
    });

    return result.map((item) => ({
      feature: item.feature,
      totalCredits: item._sum.creditsUsed || 0,
      usageCount: item._count,
    }));
  }

  // 获取每日积分使用趋势
  async getDailyUsageTrend(
    days: number = 30,
    userId?: string
  ): Promise<{
    date: Date;
    consumed: number;
    recharged: number;
    free_consumed: number;
    paid_consumed: number;
    unique_users: number;
  }[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const whereCondition = userId ? `AND user_id = '${userId}'::uuid` : '';

    const result = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        SUM(CASE WHEN operation_type = 'consume' THEN credits_used ELSE 0 END) as consumed,
        SUM(CASE WHEN operation_type = 'recharge' THEN credits_used ELSE 0 END) as recharged,
        SUM(CASE WHEN credit_type = 'free' AND operation_type = 'consume' 
            THEN credits_used ELSE 0 END) as free_consumed,
        SUM(CASE WHEN credit_type = 'paid' AND operation_type = 'consume' 
            THEN credits_used ELSE 0 END) as paid_consumed,
        COUNT(DISTINCT user_id) as unique_users
      FROM credit_usage
      WHERE created_at >= ${startDate}
        ${Prisma.raw(whereCondition)}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    return result as {
      date: Date;
      consumed: number;
      recharged: number;
      free_consumed: number;
      paid_consumed: number;
      unique_users: number;
    }[];
  }

  // 获取用户最近的积分操作
  async getRecentOperations(
    userId: string,
    limit: number = 10
  ): Promise<CreditUsage[]> {
    return await prisma.creditUsage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // 删除过期的使用记录（数据清理）
  async deleteOldRecords(daysToKeep: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await prisma.creditUsage.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }

  // 获取系统级积分使用统计
  async getSystemStats(): Promise<{
    totalUsers: number;
    totalOperations: number;
    totalConsumed: number;
    totalRecharged: number;
    avgDailyConsumption: number;
    avgDailyRecharge: number;
  }> {
    const [
      totalUsers,
      totalOperations,
      consumeStats,
      rechargeStats,
    ] = await Promise.all([
      prisma.creditUsage.groupBy({
        by: ['userId'],
      }).then((result) => result.length),
      prisma.creditUsage.count(),
      prisma.creditUsage.aggregate({
        where: { operationType: OperationType.CONSUME },
        _sum: { creditsUsed: true },
        _count: true,
      }),
      prisma.creditUsage.aggregate({
        where: { operationType: OperationType.RECHARGE },
        _sum: { creditsUsed: true },
        _count: true,
      }),
    ]);

    // 计算运营天数（从第一条记录到现在）
    const firstRecord = await prisma.creditUsage.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });

    const operatingDays = firstRecord && firstRecord.createdAt
      ? Math.ceil((Date.now() - firstRecord.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      : 1;

    const totalConsumed = consumeStats._sum.creditsUsed || 0;
    const totalRecharged = rechargeStats._sum.creditsUsed || 0;

    return {
      totalUsers,
      totalOperations,
      totalConsumed,
      totalRecharged,
      avgDailyConsumption: Math.round(totalConsumed / operatingDays),
      avgDailyRecharge: Math.round(totalRecharged / operatingDays),
    };
  }

  // 检查是否存在重复记录（用于幂等性检查）
  async isDuplicateOperation(
    userId: string,
    orderId: string,
    operationType: string
  ): Promise<boolean> {
    const count = await prisma.creditUsage.count({
      where: {
        userId,
        orderId,
        operationType,
      },
    });

    return count > 0;
  }
}

export const creditUsageService = new CreditUsageService();