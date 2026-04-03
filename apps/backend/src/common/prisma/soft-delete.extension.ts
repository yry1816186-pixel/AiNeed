import { Prisma } from '@prisma/client';

/**
 * Prisma 扩展操作参数类型
 */
interface ExtensionArgs {
  where?: Record<string, unknown>;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Prisma 扩展上下文类型
 */
interface ExtensionContext {
  model: string;
  operation: string;
}

/**
 * Soft Delete Prisma Extension
 *
 * 自动为所有查询添加软删除过滤 (isDeleted: false)
 * 这样可以确保已删除的记录永远不会被查询到
 *
 * 支持的模型：
 * - ClothingItem (商品)
 * - Order (订单)
 * - CommunityPost (社区帖子)
 * - PostComment (评论)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const softDeleteExtension = Prisma.defineExtension((client) => {
  return client.$extends({
    query: {
      $allModels: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async $allOperations({ args, query, model }: { args: any; query: (args: any) => Promise<any>; model: string }) {
          // 需要软删除的模型列表
          const softDeleteModels = [
            'ClothingItem',
            'Order',
            'CommunityPost',
            'PostComment',
          ];

          // 如果是软删除模型，自动添加 isDeleted: false 过滤
          if (softDeleteModels.includes(model)) {
            const currentWhere = args.where || {};

            // 处理 findFirst, findMany, findUnique, update, delete 等
            if (!currentWhere.isDeleted) {
              // 为 where 子句添加软删除过滤
              args.where = {
                ...currentWhere,
                isDeleted: false,
              };
            }
          }

          return query(args);
        },
      },
    },
    model: {
      $allModels: {
        /**
         * 软删除方法
         * 将记录标记为已删除，而不是真正删除
         */
        async softDelete<T extends { update: (args: ExtensionArgs) => Promise<unknown> }>(
          this: T,
          args: ExtensionArgs,
        ): Promise<unknown> {
          const context = Prisma.getExtensionContext(this) as T;

          return context.update({
            where: args.where,
            data: {
              ...args.data,
              isDeleted: true,
              deletedAt: new Date(),
            },
          });
        },

        /**
         * 批量软删除方法
         */
        async softDeleteMany<T extends { updateMany: (args: ExtensionArgs) => Promise<unknown> }>(
          this: T,
          args: ExtensionArgs,
        ): Promise<unknown> {
          const context = Prisma.getExtensionContext(this) as T;

          return context.updateMany({
            where: args.where,
            data: {
              ...args.data,
              isDeleted: true,
              deletedAt: new Date(),
            },
          });
        },
      },
    },
  });
});

/**
 * 创建带有软删除扩展的 Prisma 客户端
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createSoftDeletePrismaClient<T extends { $extends: (extension: any) => any }>(
  prisma: T,
): ReturnType<T['$extends']> {
  return prisma.$extends(softDeleteExtension);
}
