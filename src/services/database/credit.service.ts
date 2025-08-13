import { PrismaClient, Prisma } from '@prisma/client';
import type { Credit, CreditUsage } from '@prisma/client';
import { CreditType, OperationType } from '@/db/constants';

const prisma = new PrismaClient();

export class CreditService {
  // 初始化用户积分
  async initializeCredits(
    userId: string,
    freeCredits: number = 50
  ): Promise<Credit> {
    return await prisma.credit.create({
      data: {
        userId,
        balanceFree: freeCredits,
        totalFreeLimit: freeCredits,
        balancePaid: 0,
        totalPaidLimit: 0,
      },
    });
  }

  // 获取用户积分信息
  async getCredits(userId: string): Promise<Credit | null> {
    return await prisma.credit.findUnique({
      where: { userId },
    });
  }

  // 获取用户总积分余额
  async getTotalBalance(userId: string): Promise<number> {
    const credits = await this.getCredits(userId);
    if (!credits) return 0;
    return credits.balanceFree + credits.balancePaid;
  }

  // 充值积分（事务处理）
  async rechargeCredits(
    userId: string,
    amount: number,
    creditType: string,
    orderId?: string,
    feature?: string
  ): Promise<{ credit: Credit; usage: CreditUsage }> {
    return await prisma.$transaction(async (tx) => {
      // 获取当前积分信息
      const currentCredit = await tx.credit.findUnique({
        where: { userId },
      });

      if (!currentCredit) {
        throw new Error('User credits not found');
      }

      // 更新积分余额
      const updateData: Prisma.CreditUpdateInput = {};
      if (creditType === CreditType.FREE) {
        updateData.balanceFree = currentCredit.balanceFree + amount;
        updateData.totalFreeLimit = currentCredit.totalFreeLimit + amount;
      } else {
        updateData.balancePaid = currentCredit.balancePaid + amount;
        updateData.totalPaidLimit = currentCredit.totalPaidLimit + amount;
      }

      const credit = await tx.credit.update({
        where: { userId },
        data: updateData,
      });

      // 记录积分充值
      const usage = await tx.creditUsage.create({
        data: {
          userId,
          feature,
          orderId,
          creditType,
          operationType: OperationType.RECHARGE,
          creditsUsed: amount,
        },
      });

      return { credit, usage };
    });
  }

  // 消耗积分（事务处理）
  async consumeCredits(
    userId: string,
    amount: number,
    feature: string,
    orderId?: string
  ): Promise<{ credit: Credit; usage: CreditUsage[] }> {
    return await prisma.$transaction(async (tx) => {
      // 获取当前积分信息
      const currentCredit = await tx.credit.findUnique({
        where: { userId },
      });

      if (!currentCredit) {
        throw new Error('User credits not found');
      }

      // 检查总余额是否足够
      const totalBalance = currentCredit.balanceFree + currentCredit.balancePaid;
      if (totalBalance < amount) {
        throw new Error('Insufficient credits');
      }

      // 优先扣除免费积分，不足部分从付费积分扣除
      const freeToDeduct = Math.min(amount, currentCredit.balanceFree);
      const paidToDeduct = amount - freeToDeduct;

      const credit = await tx.credit.update({
        where: { userId },
        data: {
          balanceFree: currentCredit.balanceFree - freeToDeduct,
          balancePaid: currentCredit.balancePaid - paidToDeduct,
        },
      });

      // 记录积分消耗
      const usageRecords = [];
      if (freeToDeduct > 0) {
        const freeUsage = await tx.creditUsage.create({
          data: {
            userId,
            feature,
            orderId,
            creditType: CreditType.FREE,
            operationType: OperationType.CONSUME,
            creditsUsed: freeToDeduct,
          },
        });
        usageRecords.push(freeUsage);
      }

      if (paidToDeduct > 0) {
        const paidUsage = await tx.creditUsage.create({
          data: {
            userId,
            feature,
            orderId,
            creditType: CreditType.PAID,
            operationType: OperationType.CONSUME,
            creditsUsed: paidToDeduct,
          },
        });
        usageRecords.push(paidUsage);
      }

      return { credit, usage: usageRecords };
    });
  }

  // 冻结积分
  async freezeCredits(
    userId: string,
    amount: number,
    reason: string
  ): Promise<{ credit: Credit; usage: CreditUsage }> {
    return await prisma.$transaction(async (tx) => {
      const currentCredit = await tx.credit.findUnique({
        where: { userId },
      });

      if (!currentCredit) {
        throw new Error('User credits not found');
      }

      // 优先冻结付费积分
      const paidToFreeze = Math.min(amount, currentCredit.balancePaid);
      const freeToFreeze = amount - paidToFreeze;

      if (freeToFreeze > currentCredit.balanceFree) {
        throw new Error('Insufficient credits to freeze');
      }

      const credit = await tx.credit.update({
        where: { userId },
        data: {
          balanceFree: currentCredit.balanceFree - freeToFreeze,
          balancePaid: currentCredit.balancePaid - paidToFreeze,
        },
      });

      const usage = await tx.creditUsage.create({
        data: {
          userId,
          feature: reason,
          creditType: paidToFreeze > 0 ? CreditType.PAID : CreditType.FREE,
          operationType: OperationType.FREEZE,
          creditsUsed: amount,
        },
      });

      return { credit, usage };
    });
  }

  // 解冻积分
  async unfreezeCredits(
    userId: string,
    amount: number,
    creditType: string,
    reason: string
  ): Promise<{ credit: Credit; usage: CreditUsage }> {
    return await prisma.$transaction(async (tx) => {
      const currentCredit = await tx.credit.findUnique({
        where: { userId },
      });

      if (!currentCredit) {
        throw new Error('User credits not found');
      }

      const updateData: Prisma.CreditUpdateInput = {};
      if (creditType === CreditType.FREE) {
        updateData.balanceFree = currentCredit.balanceFree + amount;
      } else {
        updateData.balancePaid = currentCredit.balancePaid + amount;
      }

      const credit = await tx.credit.update({
        where: { userId },
        data: updateData,
      });

      const usage = await tx.creditUsage.create({
        data: {
          userId,
          feature: reason,
          creditType,
          operationType: OperationType.UNFREEZE,
          creditsUsed: amount,
        },
      });

      return { credit, usage };
    });
  }

  // 退款扣除积分
  async refundCredits(
    userId: string,
    amount: number,
    orderId: string
  ): Promise<{ credit: Credit; usage: CreditUsage }> {
    return await prisma.$transaction(async (tx) => {
      const currentCredit = await tx.credit.findUnique({
        where: { userId },
      });

      if (!currentCredit) {
        throw new Error('User credits not found');
      }

      // 退款优先扣除付费积分
      const paidToDeduct = Math.min(amount, currentCredit.balancePaid);
      const freeToDeduct = amount - paidToDeduct;

      const credit = await tx.credit.update({
        where: { userId },
        data: {
          balancePaid: Math.max(0, currentCredit.balancePaid - paidToDeduct),
          balanceFree: Math.max(0, currentCredit.balanceFree - freeToDeduct),
          totalPaidLimit: Math.max(0, currentCredit.totalPaidLimit - paidToDeduct),
          totalFreeLimit: Math.max(0, currentCredit.totalFreeLimit - freeToDeduct),
        },
      });

      const usage = await tx.creditUsage.create({
        data: {
          userId,
          feature: 'Refund',
          orderId,
          creditType: paidToDeduct > 0 ? CreditType.PAID : CreditType.FREE,
          operationType: OperationType.CONSUME,
          creditsUsed: amount,
        },
      });

      return { credit, usage };
    });
  }

  // 重置免费积分
  async resetFreeCredits(userId: string, newLimit: number = 50): Promise<Credit> {
    return await prisma.credit.update({
      where: { userId },
      data: {
        balanceFree: newLimit,
        totalFreeLimit: newLimit,
      },
    });
  }

  // 批量更新积分（管理员操作）
  async adjustCredits(
    userId: string,
    adjustments: {
      balanceFree?: number;
      balancePaid?: number;
      totalFreeLimit?: number;
      totalPaidLimit?: number;
    }
  ): Promise<Credit> {
    const currentCredit = await this.getCredits(userId);
    if (!currentCredit) {
      throw new Error('User credits not found');
    }

    return await prisma.credit.update({
      where: { userId },
      data: {
        balanceFree: adjustments.balanceFree ?? currentCredit.balanceFree,
        balancePaid: adjustments.balancePaid ?? currentCredit.balancePaid,
        totalFreeLimit: adjustments.totalFreeLimit ?? currentCredit.totalFreeLimit,
        totalPaidLimit: adjustments.totalPaidLimit ?? currentCredit.totalPaidLimit,
      },
    });
  }

  // 获取积分不足的用户
  async getLowBalanceUsers(threshold: number = 10): Promise<Credit[]> {
    return await prisma.$queryRaw<Credit[]>`
      SELECT * FROM credits 
      WHERE (balance_free + balance_paid) < ${threshold}
      ORDER BY (balance_free + balance_paid) ASC
    `;
  }

  // 获取积分统计信息
  async getCreditStats(): Promise<{
    totalUsers: number;
    totalFreeBalance: number;
    totalPaidBalance: number;
    avgFreeBalance: number;
    avgPaidBalance: number;
    zeroBalanceUsers: number;
  }> {
    const stats = await prisma.credit.aggregate({
      _count: true,
      _sum: {
        balanceFree: true,
        balancePaid: true,
      },
      _avg: {
        balanceFree: true,
        balancePaid: true,
      },
    });

    const zeroBalanceUsers = await prisma.credit.count({
      where: {
        AND: [
          { balanceFree: 0 },
          { balancePaid: 0 },
        ],
      },
    });

    return {
      totalUsers: stats._count,
      totalFreeBalance: stats._sum.balanceFree || 0,
      totalPaidBalance: stats._sum.balancePaid || 0,
      avgFreeBalance: Math.round(stats._avg.balanceFree || 0),
      avgPaidBalance: Math.round(stats._avg.balancePaid || 0),
      zeroBalanceUsers,
    };
  }

  // 检查用户是否有足够积分
  async hasEnoughCredits(userId: string, amount: number): Promise<boolean> {
    const totalBalance = await this.getTotalBalance(userId);
    return totalBalance >= amount;
  }
}

export const creditService = new CreditService();