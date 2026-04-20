/**
 * @fileoverview 通用分页工具函数
 *
 * 消除 Service 层重复的分页查询逻辑。10+ 个 Service 中存在相同的模式：
 *   const [items, total] = await Promise.all([
 *     this.prisma.xxxModel.findMany({ where, skip, take }),
 *     this.prisma.xxxModel.count({ where }),
 *   ]);
 *   return { data: items, meta: { total, page, pageSize, totalPages } };
 *
 * 使用方式：
 *   const result = await paginate(prisma, 'communityPost', { where, page, pageSize, include });
 *
 * @module common/utils/pagination
 */

import { PrismaService } from "../prisma/prisma.service";
import { PaginatedResponse, createPaginatedResponse } from "../types/api-response.types";

/**
 * 分页查询选项
 */
export interface PaginateOptions {
  /** 查询条件 */
  where?: Record<string, unknown>;
  /** 当前页码（1-indexed），默认 1 */
  page?: number;
  /** 每页条数，默认 20 */
  pageSize?: number;
  /** Prisma include 关联查询 */
  include?: Record<string, unknown>;
  /** Prisma select 字段选择 */
  select?: Record<string, unknown>;
  /** 排序条件 */
  orderBy?: Record<string, unknown> | Record<string, unknown>[];
}

/**
 * 通用 Prisma 分页查询
 *
 * 封装 findMany + count 并行查询，返回标准分页响应格式。
 * 复用 {@link createPaginatedResponse} 保证与项目统一分页类型一致。
 *
 * @template T - 返回数据项类型
 * @param prisma - PrismaService 实例
 * @param model - Prisma 模型名称（如 'user', 'communityPost'）
 * @param options - 分页查询选项
 * @returns 标准分页响应 {@link PaginatedResponse}
 *
 * @example
 * ```typescript
 * // 基础用法
 * const result = await paginate(prisma, 'brand', {
 *   where: { isActive: true },
 *   page: 1,
 *   pageSize: 20,
 *   orderBy: { name: 'asc' },
 * });
 *
 * // 带关联查询
 * const result = await paginate<BrandWithCount>(prisma, 'brand', {
 *   where: { isActive: true },
 *   include: { _count: { select: { products: true } } },
 *   page: 2,
 *   pageSize: 10,
 * });
 * ```
 */
export async function paginate<T>(
  prisma: PrismaService,
  model: keyof PrismaService,
  options: PaginateOptions = {}
): Promise<PaginatedResponse<T>> {
  const { page = 1, pageSize = 20, where = {}, include, select, orderBy } = options;

  const skip = (page - 1) * pageSize;

  // 构建 findMany 选项
  const findManyOptions: Record<string, unknown> = {
    where,
    skip,
    take: pageSize,
  };
  if (include) {
    findManyOptions.include = include;
  }
  if (select) {
    findManyOptions.select = select;
  }
  if (orderBy) {
    findManyOptions.orderBy = orderBy;
  }

  // 并行执行查询和计数
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modelDelegate = prisma[model] as any;
  const [items, total] = await Promise.all([
    modelDelegate.findMany(findManyOptions),
    modelDelegate.count({ where }),
  ]);

  return createPaginatedResponse<T>(items, total, page, pageSize);
}
