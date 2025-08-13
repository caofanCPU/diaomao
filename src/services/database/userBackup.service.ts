/* eslint-disable @typescript-eslint/no-explicit-any */

import { PrismaClient, Prisma } from '@prisma/client';
import type{ UserBackup } from '@prisma/client';

const prisma = new PrismaClient();

export class UserBackupService {
  // 创建用户备份
  async createBackup(data: {
    originalUserId: string;
    fingerprintId?: string;
    clerkUserId?: string;
    email?: string;
    status?: string;
    backupData?: any;
  }): Promise<UserBackup> {
    return await prisma.userBackup.create({
      data: {
        originalUserId: data.originalUserId,
        fingerprintId: data.fingerprintId,
        clerkUserId: data.clerkUserId,
        email: data.email,
        status: data.status,
        backupData: data.backupData,
      },
    });
  }

  // 备份用户基本数据
  async backupUserData(userId: string): Promise<UserBackup> {
    // 获取用户基本数据
    const userData = await prisma.user.findUnique({
      where: { userId },
    });

    if (!userData) {
      throw new Error('User not found');
    }

    // 创建备份记录
    return await this.createBackup({
      originalUserId: userData.userId,
      fingerprintId: userData.fingerprintId || undefined,
      clerkUserId: userData.clerkUserId || undefined,
      email: userData.email || undefined,
      status: userData.status,
      backupData: {
        id: userData.id.toString(),
        userId: userData.userId,
        fingerprintId: userData.fingerprintId,
        clerkUserId: userData.clerkUserId,
        email: userData.email,
        status: userData.status,
        createdAt: userData.createdAt?.toISOString(),
        updatedAt: userData.updatedAt?.toISOString(),
      },
    });
  }

  // 通过原始用户ID查找备份
  async findByOriginalUserId(
    originalUserId: string
  ): Promise<UserBackup[]> {
    return await prisma.userBackup.findMany({
      where: { originalUserId },
      orderBy: { deletedAt: 'desc' },
    });
  }

  // 通过邮箱查找备份
  async findByEmail(email: string): Promise<UserBackup[]> {
    return await prisma.userBackup.findMany({
      where: { email },
      orderBy: { deletedAt: 'desc' },
    });
  }

  // 通过Fingerprint ID查找备份
  async findByFingerprintId(
    fingerprintId: string
  ): Promise<UserBackup[]> {
    return await prisma.userBackup.findMany({
      where: { fingerprintId },
      orderBy: { deletedAt: 'desc' },
    });
  }

  // 通过Clerk用户ID查找备份
  async findByClerkUserId(
    clerkUserId: string
  ): Promise<UserBackup[]> {
    return await prisma.userBackup.findMany({
      where: { clerkUserId },
      orderBy: { deletedAt: 'desc' },
    });
  }

  // 获取备份详情
  async getBackupById(id: bigint): Promise<UserBackup | null> {
    return await prisma.userBackup.findUnique({
      where: { id },
    });
  }

  // 恢复用户数据
  async restoreUserData(backupId: bigint): Promise<{ user: unknown }> {
    const backup = await this.getBackupById(backupId);
    if (!backup) {
      throw new Error('Backup not found');
    }

    const backupData = backup.backupData as any;
    if (!backupData) {
      throw new Error('No backup data available');
    }

    return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 恢复用户主数据
      const user = await tx.user.create({
        data: {
          fingerprintId: backupData.fingerprintId,
          clerkUserId: backupData.clerkUserId,
          email: backupData.email,
          status: backupData.status,
        },
      });

      return {
        user,
      };
    });
  }

  // 获取备份列表
  async listBackups(params: {
    skip?: number;
    take?: number;
    startDate?: Date;
    endDate?: Date;
    orderBy?: Prisma.UserBackupOrderByWithRelationInput;
  }): Promise<{ backups: UserBackup[]; total: number }> {
    const where: Prisma.UserBackupWhereInput = {};

    if (params.startDate || params.endDate) {
      where.deletedAt = {};
      if (params.startDate) where.deletedAt.gte = params.startDate;
      if (params.endDate) where.deletedAt.lte = params.endDate;
    }

    const [backups, total] = await Promise.all([
      prisma.userBackup.findMany({
        where,
        skip: params.skip || 0,
        take: params.take || 20,
        orderBy: params.orderBy || { deletedAt: 'desc' },
        select: {
          id: true,
          originalUserId: true,
          fingerprintId: true,
          clerkUserId: true,
          email: true,
          status: true,
          backupData: true,
          deletedAt: true,
          createdAt: true,
        },
      }),
      prisma.userBackup.count({ where }),
    ]);

    return { backups, total };
  }

  // 删除旧备份（数据清理）
  async deleteOldBackups(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await prisma.userBackup.deleteMany({
      where: {
        deletedAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }

  // 获取备份统计信息
  async getBackupStats(): Promise<{
    totalBackups: number;
    last24Hours: number;
    last7Days: number;
    last30Days: number;
    avgBackupSize: number;
  }> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalBackups,
      last24Hours,
      last7Days,
      last30Days,
    ] = await Promise.all([
      prisma.userBackup.count(),
      prisma.userBackup.count({
        where: { deletedAt: { gte: oneDayAgo } },
      }),
      prisma.userBackup.count({
        where: { deletedAt: { gte: sevenDaysAgo } },
      }),
      prisma.userBackup.count({
        where: { deletedAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    // 计算平均备份大小（简化计算）
    const sampleBackups = await prisma.userBackup.findMany({
      take: 100,
      select: { backupData: true },
    });

    const avgBackupSize = sampleBackups.length > 0
      ? sampleBackups.reduce((sum: number, backup: { backupData: unknown }) => {
          const size = JSON.stringify(backup.backupData || {}).length;
          return sum + size;
        }, 0) / sampleBackups.length
      : 0;

    return {
      totalBackups,
      last24Hours,
      last7Days,
      last30Days,
      avgBackupSize: Math.round(avgBackupSize),
    };
  }

  // 导出备份数据为JSON
  async exportBackup(backupId: bigint): Promise<string> {
    const backup = await this.getBackupById(backupId);
    if (!backup) {
      throw new Error('Backup not found');
    }

    return JSON.stringify(backup, null, 2);
  }

  // 批量备份用户（用于定期备份任务）
  async batchBackupUsers(userIds: string[]): Promise<number> {
    let successCount = 0;

    for (const userId of userIds) {
      try {
        await this.backupUserData(userId);
        successCount++;
      } catch (error) {
        console.error(`Failed to backup user ${userId}:`, error);
      }
    }

    return successCount;
  }
}

export const userBackupService = new UserBackupService();