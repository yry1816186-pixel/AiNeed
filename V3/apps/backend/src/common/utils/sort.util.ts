export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

export type OrderByInput = Record<string, 'asc' | 'desc'>;

const SORT_DIRECTION_MAP: Record<string, 'asc' | 'desc'> = {
  asc: 'asc',
  desc: 'desc',
  ascending: 'asc',
  descending: 'desc',
};

export function parseSort(
  sortString: string,
  allowedFields: ReadonlySet<string> | string[],
): OrderByInput {
  const allowed =
    allowedFields instanceof Set
      ? allowedFields
      : new Set(allowedFields);

  if (!sortString || typeof sortString !== 'string') {
    return { createdAt: 'desc' };
  }

  const parts = sortString.split(',').filter((s) => s.trim().length > 0);
  const orderBy: OrderByInput = {};

  for (const part of parts) {
    const trimmed = part.trim();
    const lastUnderscoreIndex = trimmed.lastIndexOf('_');

    if (lastUnderscoreIndex <= 0) continue;

    const field = trimmed.slice(0, lastUnderscoreIndex);
    const directionStr = trimmed.slice(lastUnderscoreIndex + 1).toLowerCase();
    const direction = SORT_DIRECTION_MAP[directionStr];

    if (!direction) continue;
    if (!allowed.has(field)) continue;

    orderBy[field] = direction;
  }

  if (Object.keys(orderBy).length === 0) {
    return { createdAt: 'desc' };
  }

  return orderBy;
}

export function parseSortToParams(
  sortString: string,
  allowedFields: ReadonlySet<string> | string[],
): SortParams[] {
  const allowed =
    allowedFields instanceof Set
      ? allowedFields
      : new Set(allowedFields);

  if (!sortString || typeof sortString !== 'string') {
    return [{ field: 'createdAt', direction: 'desc' }];
  }

  const parts = sortString.split(',').filter((s) => s.trim().length > 0);
  const result: SortParams[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    const lastUnderscoreIndex = trimmed.lastIndexOf('_');

    if (lastUnderscoreIndex <= 0) continue;

    const field = trimmed.slice(0, lastUnderscoreIndex);
    const directionStr = trimmed.slice(lastUnderscoreIndex + 1).toLowerCase();
    const direction = SORT_DIRECTION_MAP[directionStr];

    if (!direction) continue;
    if (!allowed.has(field)) continue;

    result.push({ field, direction });
  }

  if (result.length === 0) {
    return [{ field: 'createdAt', direction: 'desc' }];
  }

  return result;
}
