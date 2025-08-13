import { PrismaClient, Prisma } from '@prisma/client';
import type { Subscription } from '@prisma/client';
import { SubscriptionStatus } from '@/db/constants';

const prisma = new PrismaClient();

export class SubscriptionService {
  // Create a new subscription
  async createSubscription(data: {
    userId: string;
    paySubscriptionId?: string;
    priceId?: string;
    priceName?: string;
    status?: string;
    creditsAllocated: number;
    subPeriodStart?: Date;
    subPeriodEnd?: Date;
  }): Promise<Subscription> {
    return await prisma.subscription.create({
      data: {
        userId: data.userId,
        paySubscriptionId: data.paySubscriptionId,
        priceId: data.priceId,
        priceName: data.priceName,
        status: data.status || SubscriptionStatus.INCOMPLETE,
        creditsAllocated: data.creditsAllocated,
        subPeriodStart: data.subPeriodStart,
        subPeriodEnd: data.subPeriodEnd,
      },
    });
  }

  // Find subscription by ID
  async findById(subscriptionId: string): Promise<Subscription | null> {
    return await prisma.subscription.findUnique({
      where: { subscriptionId },
      include: {
        user: true,
      },
    });
  }

  // Find subscription by pay subscription ID
  async findByPaySubscriptionId(
    paySubscriptionId: string
  ): Promise<Subscription | null> {
    return await prisma.subscription.findUnique({
      where: { paySubscriptionId },
      include: {
        user: true,
      },
    });
  }

  // Get user's subscription list
  async findByUserId(
    userId: string,
    params?: {
      status?: string;
      includeExpired?: boolean;
    }
  ): Promise<Subscription[]> {
    const where: Prisma.SubscriptionWhereInput = {
      userId,
    };

    if (params?.status) {
      where.status = params.status;
    }

    if (!params?.includeExpired) {
      where.OR = [
        { subPeriodEnd: { gte: new Date() } },
        { subPeriodEnd: null },
      ];
    }

    return await prisma.subscription.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  // Get user's active subscription
  async getActiveSubscription(userId: string): Promise<Subscription | null> {
    return await prisma.subscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
        OR: [
          { subPeriodEnd: { gte: new Date() } },
          { subPeriodEnd: null },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Update subscription
  async updateSubscription(
    subscriptionId: string,
    data: Prisma.SubscriptionUpdateInput
  ): Promise<Subscription> {
    return await prisma.subscription.update({
      where: { subscriptionId },
      data,
    });
  }

  // Update subscription status
  async updateStatus(
    subscriptionId: string,
    status: string
  ): Promise<Subscription> {
    return await prisma.subscription.update({
      where: { subscriptionId },
      data: { status },
    });
  }

  // Update subscription period
  async updatePeriod(
    subscriptionId: string,
    subPeriodStart: Date,
    subPeriodEnd: Date
  ): Promise<Subscription> {
    return await prisma.subscription.update({
      where: { subscriptionId },
      data: {
        subPeriodStart,
        subPeriodEnd,
      },
    });
  }

  // Cancel subscription
  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = true
  ): Promise<Subscription> {
    const updateData: Prisma.SubscriptionUpdateInput = {
      status: SubscriptionStatus.CANCELED,
    };

    if (!cancelAtPeriodEnd) {
      updateData.subPeriodEnd = new Date();
    }

    return await prisma.subscription.update({
      where: { subscriptionId },
      data: updateData,
    });
  }

  // Renew subscription
  async renewSubscription(
    subscriptionId: string,
    newPeriodEnd: Date,
    creditsToAdd?: number
  ): Promise<Subscription> {
    const subscription = await prisma.subscription.findUnique({
      where: { subscriptionId },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    return await prisma.subscription.update({
      where: { subscriptionId },
      data: {
        status: SubscriptionStatus.ACTIVE,
        subPeriodStart: subscription.subPeriodEnd || new Date(),
        subPeriodEnd: newPeriodEnd,
        creditsAllocated: creditsToAdd
          ? subscription.creditsAllocated + creditsToAdd
          : subscription.creditsAllocated,
      },
    });
  }

  // Delete subscription
  async deleteSubscription(subscriptionId: string): Promise<void> {
    await prisma.subscription.delete({
      where: { subscriptionId },
    });
  }

  // Get expiring subscriptions (within 7 days)
  async getExpiringSubscriptions(days: number = 7): Promise<Subscription[]> {
    const now = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    return await prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        subPeriodEnd: {
          gte: now,
          lte: expiryDate,
        },
      },
      include: {
        user: true,
      },
    });
  }

  // Get expired subscriptions
  async getExpiredSubscriptions(): Promise<Subscription[]> {
    return await prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        subPeriodEnd: {
          lt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });
  }

  // Update expired subscriptions status
  async updateExpiredSubscriptions(): Promise<number> {
    const result = await prisma.subscription.updateMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        subPeriodEnd: {
          lt: new Date(),
        },
      },
      data: {
        status: SubscriptionStatus.PAST_DUE,
      },
    });

    return result.count;
  }

  // Get subscription statistics
  async getSubscriptionStats(): Promise<{
    total: number;
    active: number;
    canceled: number;
    pastDue: number;
    incomplete: number;
    trialing: number;
    revenue: number;
  }> {
    const [total, active, canceled, pastDue, incomplete, trialing] =
      await Promise.all([
        prisma.subscription.count(),
        prisma.subscription.count({
          where: { status: SubscriptionStatus.ACTIVE }
        }),
        prisma.subscription.count({
          where: { status: SubscriptionStatus.CANCELED }
        }),
        prisma.subscription.count({
          where: { status: SubscriptionStatus.PAST_DUE }
        }),
        prisma.subscription.count({
          where: { status: SubscriptionStatus.INCOMPLETE }
        }),
        prisma.subscription.count({
          where: { status: SubscriptionStatus.TRIALING }
        }),
      ]);

    // Calculate active subscription revenue (need to combine with transaction table)
    const activeSubscriptions = await prisma.subscription.findMany({
      where: { status: SubscriptionStatus.ACTIVE },
      select: { paySubscriptionId: true },
    });

    let revenue = 0;
    if (activeSubscriptions.length > 0) {
      const transactions = await prisma.transaction.findMany({
        where: {
          paySubscriptionId: {
            in: activeSubscriptions
              .map(s => s.paySubscriptionId)
              .filter(Boolean) as string[],
          },
          orderStatus: 'success',
        },
        select: { amount: true },
      });

      revenue = transactions.reduce((sum, t) =>
        sum + (t.amount ? parseFloat(t.amount.toString()) : 0), 0
      );
    }

    return { total, active, canceled, pastDue, incomplete, trialing, revenue };
  }
}

export const subscriptionService = new SubscriptionService();