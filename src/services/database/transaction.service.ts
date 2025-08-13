/* eslint-disable @typescript-eslint/no-explicit-any */

import { PrismaClient, Prisma } from '@prisma/client';
import type { Transaction } from '@prisma/client';
import { OrderStatus, TransactionType, PaySupplier } from '@/db/constants';

const prisma = new PrismaClient();

export class TransactionService {
  // 创建交易订单
  async createTransaction(data: {
    userId: string;
    orderId: string;
    orderStatus?: string;
    paySupplier?: PaySupplier;
    payTransactionId?: string;
    paySubscriptionId?: string;
    paySessionId?: string;
    payInvoiceId?: string;
    priceId?: string;
    priceName?: string;
    subIntervalCount?: number;
    subCycleAnchor?: Date;
    amount?: number;
    currency?: string;
    type?: string;
    creditsGranted?: number;
    subPeriodStart?: Date;
    subPeriodEnd?: Date;
    orderDetail?: string;
    orderExpiredAt?: Date;
    payCreatedAt?: Date;
    payUpdatedAt?: Date;
  }): Promise<Transaction> {
    return await prisma.transaction.create({
      data: {
        userId: data.userId,
        orderId: data.orderId,
        orderStatus: data.orderStatus || OrderStatus.CREATED,
        orderExpiredAt: data.orderExpiredAt || new Date(Date.now() + 30 * 60 * 1000), // 默认30分钟过期
        paySupplier: data.paySupplier,
        payTransactionId: data.payTransactionId,
        paySubscriptionId: data.paySubscriptionId,
        paySessionId: data.paySessionId,
        payInvoiceId: data.payInvoiceId,
        priceId: data.priceId,
        priceName: data.priceName,
        subIntervalCount: data.subIntervalCount,
        subCycleAnchor: data.subCycleAnchor,
        amount: data.amount,
        currency: data.currency || 'CNY',
        type: data.type,
        creditsGranted: data.creditsGranted || 0,
        subPeriodStart: data.subPeriodStart,
        subPeriodEnd: data.subPeriodEnd,
        orderDetail: data.orderDetail,
        payCreatedAt: data.payCreatedAt,
        payUpdatedAt: data.payUpdatedAt,
      },
    });
  }

  // 通过订单ID查找
  async findByOrderId(orderId: string): Promise<Transaction | null> {
    return await prisma.transaction.findUnique({
      where: { orderId },
      include: {
        user: true,
      },
    });
  }

  // 通过支付Session ID查找
  async findByPaySessionId(
    paySessionId: string
  ): Promise<Transaction | null> {
    return await prisma.transaction.findFirst({
      where: { paySessionId },
      include: {
        user: true,
      },
    });
  }

  // 通过支付Transaction ID查找
  async findByPayTransactionId(
    payTransactionId: string
  ): Promise<Transaction | null> {
    return await prisma.transaction.findUnique({
      where: { payTransactionId },
    });
  }

  // 获取用户交易列表
  async findByUserId(
    userId: string,
    params?: {
      orderStatus?: string;
      type?: string;
      skip?: number;
      take?: number;
      orderBy?: Prisma.TransactionOrderByWithRelationInput;
    }
  ): Promise<{ transactions: Transaction[]; total: number }> {
    const where: Prisma.TransactionWhereInput = { userId };

    if (params?.orderStatus) {
      where.orderStatus = params.orderStatus;
    }

    if (params?.type) {
      where.type = params.type;
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip: params?.skip || 0,
        take: params?.take || 10,
        orderBy: params?.orderBy || { orderCreatedAt: 'desc' },
      }),
      prisma.transaction.count({ where }),
    ]);

    return { transactions, total };
  }

  // 更新交易状态
  async updateStatus(
    orderId: string,
    orderStatus: string,
    additionalData?: {
      paidAt?: Date;
      paidEmail?: string;
      paidDetail?: string;
      payUpdatedAt?: Date;
    }
  ): Promise<Transaction> {
    const updateData: Prisma.TransactionUpdateInput = {
      orderStatus,
      ...additionalData,
    };

    return await prisma.transaction.update({
      where: { orderId },
      data: updateData,
    });
  }

  // 完成支付
  async completePayment(
    orderId: string,
    paymentData: {
      payTransactionId?: string;
      paidAt: Date;
      paidEmail?: string;
      paidDetail?: string;
      creditsGranted?: number;
      payUpdatedAt?: Date;
    }
  ): Promise<Transaction> {
    return await prisma.transaction.update({
      where: { orderId },
      data: {
        orderStatus: OrderStatus.SUCCESS,
        payTransactionId: paymentData.payTransactionId,
        paidAt: paymentData.paidAt,
        paidEmail: paymentData.paidEmail,
        paidDetail: paymentData.paidDetail,
        creditsGranted: paymentData.creditsGranted,
        payUpdatedAt: paymentData.payUpdatedAt,
      },
    });
  }

  // 处理退款
  async processRefund(
    orderId: string,
    refundData: {
      refundAmount?: number;
      refundReason?: string;
      refundedAt?: Date;
    }
  ): Promise<Transaction> {
    const transaction = await this.findByOrderId(orderId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    return await prisma.transaction.update({
      where: { orderId },
      data: {
        orderStatus: OrderStatus.REFUNDED,
        orderDetail: JSON.stringify({
          original: transaction.orderDetail,
          refund: {
            amount: refundData.refundAmount,
            reason: refundData.refundReason,
            refundedAt: refundData.refundedAt || new Date(),
          },
        }),
      },
    });
  }

  // 取消订单
  async cancelOrder(orderId: string, reason?: string): Promise<Transaction> {
    return await prisma.transaction.update({
      where: { orderId },
      data: {
        orderStatus: OrderStatus.CANCELED,
        orderDetail: reason || 'User canceled',
      },
    });
  }

  // 获取过期订单
  async getExpiredOrders(): Promise<Transaction[]> {
    return await prisma.transaction.findMany({
      where: {
        orderStatus: OrderStatus.CREATED,
        orderExpiredAt: {
          lt: new Date(),
        },
      },
    });
  }

  // 批量更新过期订单
  async updateExpiredOrders(): Promise<number> {
    const result = await prisma.transaction.updateMany({
      where: {
        orderStatus: OrderStatus.CREATED,
        orderExpiredAt: {
          lt: new Date(),
        },
      },
      data: {
        orderStatus: OrderStatus.FAILED,
        orderDetail: 'Order expired',
      },
    });

    return result.count;
  }

  // 获取订阅相关交易
  async getSubscriptionTransactions(
    paySubscriptionId: string
  ): Promise<Transaction[]> {
    return await prisma.transaction.findMany({
      where: { paySubscriptionId },
      orderBy: { orderCreatedAt: 'desc' },
    });
  }

  // 获取成功交易统计
  async getRevenueStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalRevenue: number;
    totalTransactions: number;
    averageOrderValue: number;
    subscriptionRevenue: number;
    oneTimeRevenue: number;
    refundedAmount: number;
  }> {
    const where: Prisma.TransactionWhereInput = {
      orderStatus: OrderStatus.SUCCESS,
    };

    if (startDate || endDate) {
      where.paidAt = {};
      if (startDate) where.paidAt.gte = startDate;
      if (endDate) where.paidAt.lte = endDate;
    }

    // 获取成功交易
    const successfulTransactions = await prisma.transaction.findMany({
      where,
      select: {
        amount: true,
        type: true,
      },
    });

    // 获取退款交易
    const refundWhere: Prisma.TransactionWhereInput = {
      orderStatus: OrderStatus.REFUNDED,
    };

    if (startDate || endDate) {
      refundWhere.orderUpdatedAt = {};
      if (startDate) refundWhere.orderUpdatedAt.gte = startDate;
      if (endDate) refundWhere.orderUpdatedAt.lte = endDate;
    }

    const refundedTransactions = await prisma.transaction.findMany({
      where: refundWhere,
      select: { amount: true },
    });

    // 计算统计数据
    const totalRevenue = successfulTransactions.reduce(
      (sum, t) => sum + (t.amount ? parseFloat(t.amount.toString()) : 0),
      0
    );

    const subscriptionRevenue = successfulTransactions
      .filter(t => t.type === TransactionType.SUBSCRIPTION)
      .reduce((sum, t) => sum + (t.amount ? parseFloat(t.amount.toString()) : 0), 0);

    const oneTimeRevenue = successfulTransactions
      .filter(t => t.type === TransactionType.ONE_TIME)
      .reduce((sum, t) => sum + (t.amount ? parseFloat(t.amount.toString()) : 0), 0);

    const refundedAmount = refundedTransactions.reduce(
      (sum, t) => sum + (t.amount ? parseFloat(t.amount.toString()) : 0),
      0
    );

    return {
      totalRevenue,
      totalTransactions: successfulTransactions.length,
      averageOrderValue: successfulTransactions.length > 0 
        ? totalRevenue / successfulTransactions.length 
        : 0,
      subscriptionRevenue,
      oneTimeRevenue,
      refundedAmount,
    };
  }

  // 获取每日收入
  async getDailyRevenue(days: number = 30): Promise<any[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await prisma.$queryRaw`
      SELECT 
        DATE(paid_at) as date,
        COUNT(*) as transactions,
        SUM(amount) as revenue,
        SUM(CASE WHEN type = 'subscription' THEN amount ELSE 0 END) as subscription_revenue,
        SUM(CASE WHEN type = 'one_time' THEN amount ELSE 0 END) as onetime_revenue
      FROM transactions
      WHERE order_status = 'success'
        AND paid_at >= ${startDate}
      GROUP BY DATE(paid_at)
      ORDER BY date DESC
    `;

    return result as any[];
  }

  // 删除交易记录（谨慎使用）
  async deleteTransaction(orderId: string): Promise<void> {
    await prisma.transaction.delete({
      where: { orderId },
    });
  }

  // 批量创建交易（用于导入历史数据）
  async createBatchTransactions(
    transactions: Prisma.TransactionCreateManyInput[]
  ): Promise<number> {
    const result = await prisma.transaction.createMany({
      data: transactions,
      skipDuplicates: true,
    });

    return result.count;
  }
}

export const transactionService = new TransactionService();