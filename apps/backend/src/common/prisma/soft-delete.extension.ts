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
 * $allOperations 回调参数类型
 * Prisma 内部类型的简化版本，允许访问 where 属性
 */
interface OperationArgs {
  where?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Soft Delete Prisma Extension
 *
 * 自动为查询操作添加软删除过滤 (isDeleted: false)
 * 仅对 findMany、findFirst、count、aggregate 操作注入过滤
 * 对 findUnique、update、delete 操作不注入，以允许直接操作已删除记录
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
        async $allOperations({ args, query, model, operation }: { args: OperationArgs; query: (args: OperationArgs) => Promise<unknown>; model: string; operation: string }) {
          // 需要软删除的模型列表
          const softDeleteModels = [
            'ClothingItem',
            'Order',
            'CommunityPost',
            'PostComment',
          ];

          // 仅对查询操作注入 isDeleted 过滤
          const filterOperations = ['findMany', 'findFirst', 'count', 'aggregate'];

          // 如果是软删除模型且是查询操作，自动添加 isDeleted: false 过滤
          if (softDeleteModels.includes(model) && filterOperations.includes(operation)) {
            const currentWhere = (args.where || {});

            // 处理 findFirst, findMany, count, aggregate 等
            if (!('isDeleted' in currentWhere)) {
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
 *
 * 注意: $extends 的参数类型在 @prisma/client 中未完整导出，
 * 使用 any 是当前唯一可行的方案（已知的 Prisma 类型系统限制）
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createSoftDeletePrismaClient<T extends { $extends: (extension: any) => any }>(
  prisma: T,
): ReturnType<T['$extends']> {
  return prisma.$extends(softDeleteExtension);
}
