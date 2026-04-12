import { IsOptional, IsString, Validate } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

type FilterOperator =
  | 'eq'
  | 'gte'
  | 'lte'
  | 'gt'
  | 'lt'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'arrayOverlap';

interface ParsedFilter {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

const VALID_OPERATORS: ReadonlySet<string> = new Set([
  'eq',
  'gte',
  'lte',
  'gt',
  'lt',
  'contains',
  'startsWith',
  'endsWith',
  'arrayOverlap',
]);

function parseFilterKey(key: string): { field: string; operator: FilterOperator } | null {
  const operators = Array.from(VALID_OPERATORS) as string[];
  for (const op of operators) {
    const suffix = `_${op}`;
    if (key.endsWith(suffix)) {
      const field = key.slice(0, key.length - suffix.length);
      if (field.length === 0) return null;
      return { field, operator: op as FilterOperator };
    }
  }
  return { field: key, operator: 'eq' };
}

function buildFieldCondition(
  operator: FilterOperator,
  value: unknown,
): unknown {
  switch (operator) {
    case 'eq':
      return value;
    case 'gte':
      return { gte: value };
    case 'lte':
      return { lte: value };
    case 'gt':
      return { gt: value };
    case 'lt':
      return { lt: value };
    case 'contains':
      return { contains: value, mode: 'insensitive' };
    case 'startsWith':
      return { startsWith: value };
    case 'endsWith':
      return { endsWith: value };
    case 'arrayOverlap':
      return { has: value };
    default:
      return value;
  }
}

export type PrismaWhereInput = Record<string, unknown>;

export function buildPrismaWhere(
  filters: Record<string, unknown>,
  allowedFields: ReadonlySet<string> | string[],
): PrismaWhereInput {
  const allowed =
    allowedFields instanceof Set
      ? allowedFields
      : new Set(allowedFields);
  const where: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') continue;

    const parsed = parseFilterKey(key);
    if (!parsed) continue;

    if (!allowed.has(parsed.field)) continue;

    if (!VALID_OPERATORS.has(parsed.operator)) continue;

    const condition = buildFieldCondition(parsed.operator, value);
    if (parsed.operator === 'eq') {
      where[parsed.field] = condition;
    } else {
      const existing = where[parsed.field];
      if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
        where[parsed.field] = { ...(existing as Record<string, unknown>), ...(condition as Record<string, unknown>) };
      } else {
        where[parsed.field] = condition;
      }
    }
  }

  return where;
}

export function parseFiltersFromString(
  filtersString: string,
): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(filtersString);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

class DynamicFilterValidator {
  validate(value: string): boolean {
    if (!value) return true;
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed);
    } catch {
      return false;
    }
  }

  defaultMessage(): string {
    return 'filters must be a valid JSON object string';
  }
}

export function createFilterDto(allowedFields: string[]): new () => { filters?: string } {
  const fieldsDescription = allowedFields.join(', ');

  class DynamicFilterDto {
    @ApiPropertyOptional({
      description: `过滤条件(JSON字符串)。允许字段: ${fieldsDescription}`,
      example: `{"${allowedFields[0] ?? 'field'}":"value"}`,
    })
    @IsOptional()
    @IsString()
    @Validate(DynamicFilterValidator)
    filters?: string;
  }

  return DynamicFilterDto;
}

export type { FilterOperator, ParsedFilter };
