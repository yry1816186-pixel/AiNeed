export interface PaginationInput {
  page?: number;
  limit?: number;
}

export interface PaginationOutput {
  skip: number;
  take: number;
  page: number;
  limit: number;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export function resolvePagination(input: PaginationInput): PaginationOutput {
  const page = Math.max(input.page ?? DEFAULT_PAGE, 1);
  const rawLimit = input.limit ?? DEFAULT_LIMIT;
  const limit = Math.min(Math.max(rawLimit, 1), MAX_LIMIT);

  return {
    skip: (page - 1) * limit,
    take: limit,
    page,
    limit,
  };
}

export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number,
): PaginationMeta {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}
