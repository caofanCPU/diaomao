/* eslint-disable @typescript-eslint/no-explicit-any */

import { PrismaClient, Prisma } from '@prisma/client';
import type { User } from '@prisma/client';
import { UserStatus } from '@/db/constants';

const prisma = new PrismaClient();

export class UserService {
  // 创建用户
  async createUser(data: {
    fingerprintId?: string;
    clerkUserId?: string;
    email?: string;
    status?: string;
  }): Promise<User> {
    return await prisma.user.create({
      data: {
        fingerprintId: data.fingerprintId,
        clerkUserId: data.clerkUserId,
        email: data.email,
        status: data.status || UserStatus.ANONYMOUS,
      },
    });
  }

  // 通过ID查找用户
  async findById(userId: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { userId },
      include: {
        credits: true,
        subscriptions: {
          where: { status: 'active' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  // 通过邮箱查找用户
  async findByEmail(email: string): Promise<User | null> {
    return await prisma.user.findFirst({
      where: { email },
      include: {
        credits: true,
        subscriptions: {
          where: { status: 'active' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  // 通过Fingerprint ID查找用户
  async findByFingerprintId(fingerprintId: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { fingerprintId },
      include: {
        credits: true,
      },
    });
  }

  // 通过Clerk用户ID查找用户
  async findByClerkUserId(clerkUserId: string): Promise<User | null> {
    return await prisma.user.findUnique({
      where: { clerkUserId },
      include: {
        credits: true,
        subscriptions: {
          where: { status: 'active' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
  }

  // 更新用户
  async updateUser(
    userId: string,
    data: Prisma.UserUpdateInput
  ): Promise<User> {
    return await prisma.user.update({
      where: { userId },
      data,
    });
  }

  // 将匿名用户升级为注册用户
  async upgradeToRegistered(
    userId: string,
    data: {
      email: string;
      clerkUserId: string;
    }
  ): Promise<User> {
    return await prisma.user.update({
      where: { userId },
      data: {
        email: data.email,
        clerkUserId: data.clerkUserId,
        status: UserStatus.REGISTERED,
      },
    });
  }

  // 软删除用户（标记为deleted）
  async softDeleteUser(userId: string): Promise<User> {
    return await prisma.user.update({
      where: { userId },
      data: {
        status: UserStatus.DELETED,
        email: null,
        clerkUserId: null,
      },
    });
  }

  // 硬删除用户
  async hardDeleteUser(userId: string): Promise<void> {
    // 先备份用户数据
    const user = await prisma.user.findUnique({
      where: { userId },
      include: {
        credits: true,
        subscriptions: true,
        transactions: true,
        creditUsage: true,
      },
    });

    if (user) {
      // 备份到UserBackup表
      await prisma.userBackup.create({
        data: {
          originalUserId: user.userId,
          fingerprintId: user.fingerprintId,
          clerkUserId: user.clerkUserId,
          email: user.email,
          status: user.status,
          backupData: user as any,
        },
      });

      // 删除用户（级联删除会自动删除关联数据）
      await prisma.user.delete({
        where: { userId },
      });
    }
  }

  // 获取用户列表
  async listUsers(params: {
    skip?: number;
    take?: number;
    status?: string;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }): Promise<{ users: User[]; total: number }> {
    const { skip = 0, take = 10, status, orderBy = { createdAt: 'desc' } } = params;

    const where: Prisma.UserWhereInput = status ? { status } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          credits: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total };
  }

  // 批量创建匿名用户
  async createBatchAnonymousUsers(
    fingerprintIds: string[]
  ): Promise<number> {
    const data = fingerprintIds.map((fingerprintId) => ({
      fingerprintId,
      status: UserStatus.ANONYMOUS,
    }));

    const result = await prisma.user.createMany({
      data,
      skipDuplicates: true,
    });

    return result.count;
  }

  // 检查用户是否存在
  async exists(userId: string): Promise<boolean> {
    const count = await prisma.user.count({
      where: { userId },
    });
    return count > 0;
  }

  // 获取用户统计信息
  async getUserStats(): Promise<{
    total: number;
    anonymous: number;
    registered: number;
    frozen: number;
    deleted: number;
  }> {
    const [total, anonymous, registered, frozen, deleted] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: UserStatus.ANONYMOUS } }),
      prisma.user.count({ where: { status: UserStatus.REGISTERED } }),
      prisma.user.count({ where: { status: UserStatus.FROZEN } }),
      prisma.user.count({ where: { status: UserStatus.DELETED } }),
    ]);

    return { total, anonymous, registered, frozen, deleted };
  }
}

export const userService = new UserService();