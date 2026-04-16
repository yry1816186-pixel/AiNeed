import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma 客户端接口（支持动态模型访问）
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface PrismaClientWithModels extends PrismaClient {
  [model: string]: any;
}

/**
 * Soft Delete Service
 *
 * 提供统一的软删除操作服务
 * 确保软删除操作的一致性和可维护性
 */
@Injectable()
export class SoftDeleteService {
  private readonly logger = new Logger(SoftDeleteService.name);

  /**
   * 执行软删除
   * @param prisma Prisma client 或 transaction
   * @param model 模型名称
   * @param id 记录ID
   * @returns 是否成功删除
   */
  async softDelete(
    prisma: PrismaClientWithModels,
    model: string,
    id: string,
  ): Promise<boolean> {
    try {
      const result = await prisma[model].update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      this.logger.log(`Soft deleted ${model} with id: ${id}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to soft delete ${model} with id ${id}: ${error}`,
      );
      return false;
    }
  }

  /**
   * 批量软删除
   * @param prisma Prisma client 或 transaction
   * @param model 模型名称
   * @param ids 记录ID数组
   * @returns 成功删除的数量
   */
  async softDeleteMany(
    prisma: PrismaClientWithModels,
    model: string,
    ids: string[],
  ): Promise<number> {
    try {
      const result = await prisma[model].updateMany({
        where: {
          id: { in: ids },
        },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      });

      this.logger.log(`Soft deleted ${result.count} ${model} records`);
      return result.count;
    } catch (error) {
      this.logger.error(
        `Failed to soft delete multiple ${model} records: ${error}`,
      );
      return 0;
    }
  }

  /**
   * 恢复已删除的记录
   * @param prisma Prisma client 或 transaction
   * @param model 模型名称
   * @param id 记录ID
   * @returns 是否成功恢复
   */
  async restore(
    prisma: PrismaClientWithModels,
    model: string,
    id: string,
  ): Promise<boolean> {
    try {
      const result = await prisma[model].update({
        where: { id },
        data: {
          isDeleted: false,
          deletedAt: null,
        },
      });

      this.logger.log(`Restored ${model} with id: ${id}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to restore ${model} with id ${id}: ${error}`,
      );
      return false;
    }
  }

  /**
   * 批量恢复已删除的记录
   * @param prisma Prisma client 或 transaction
   * @param model 模型名称
   * @param ids 记录ID数组
   * @returns 成功恢复的数量
   */
  async restoreMany(
    prisma: PrismaClientWithModels,
    model: string,
    ids: string[],
  ): Promise<number> {
    try {
      const result = await prisma[model].updateMany({
        where: {
          id: { in: ids },
          isDeleted: true,
        },
        data: {
          isDeleted: false,
          deletedAt: null,
        },
      });

      this.logger.log(`Restored ${result.count} ${model} records`);
      return result.count;
    } catch (error) {
      this.logger.error(
        `Failed to restore multiple ${model} records: ${error}`,
      );
      return 0;
    }
  }

  /**
   * 永久删除已软删除的记录（硬删除）
   * @param prisma Prisma client 或 transaction
   * @param model 模型名称
   * @param daysBefore 多少天前的记录
   * @returns 删除的数量
   */
  async permanentDeleteOld(
    prisma: PrismaClientWithModels,
    model: string,
    daysBefore: number = 30,
  ): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBefore);

      const result = await prisma[model].deleteMany({
        where: {
          isDeleted: true,
          deletedAt: {
            lt: cutoffDate,
          },
        },
      });

      this.logger.log(
        `Permanently deleted ${result.count} old ${model} records`,
      );
      return result.count;
    } catch (error) {
      this.logger.error(
        `Failed to permanently delete old ${model} records: ${error}`,
      );
      return 0;
    }
  }
}
