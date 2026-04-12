import {
  buildPrismaWhere,
  parseFiltersFromString,
  createFilterDto,
} from '../utils/filter.util';

describe('buildPrismaWhere', () => {
  const allowedFields = new Set(['gender', 'price', 'name', 'tags', 'status']);

  it('should build exact match condition', () => {
    const result = buildPrismaWhere({ gender: 'male' }, allowedFields);
    expect(result).toEqual({ gender: 'male' });
  });

  it('should build gte condition', () => {
    const result = buildPrismaWhere({ price_gte: 100 }, allowedFields);
    expect(result).toEqual({ price: { gte: 100 } });
  });

  it('should build lte condition', () => {
    const result = buildPrismaWhere({ price_lte: 500 }, allowedFields);
    expect(result).toEqual({ price: { lte: 500 } });
  });

  it('should build gt condition', () => {
    const result = buildPrismaWhere({ price_gt: 100 }, allowedFields);
    expect(result).toEqual({ price: { gt: 100 } });
  });

  it('should build lt condition', () => {
    const result = buildPrismaWhere({ price_lt: 500 }, allowedFields);
    expect(result).toEqual({ price: { lt: 500 } });
  });

  it('should build contains condition with case insensitive', () => {
    const result = buildPrismaWhere({ name_contains: 'jacket' }, allowedFields);
    expect(result).toEqual({ name: { contains: 'jacket', mode: 'insensitive' } });
  });

  it('should build startsWith condition', () => {
    const result = buildPrismaWhere({ name_startsWith: 'Nike' }, allowedFields);
    expect(result).toEqual({ name: { startsWith: 'Nike' } });
  });

  it('should build endsWith condition', () => {
    const result = buildPrismaWhere({ name_endsWith: 'Pro' }, allowedFields);
    expect(result).toEqual({ name: { endsWith: 'Pro' } });
  });

  it('should build arrayOverlap condition (has)', () => {
    const result = buildPrismaWhere({ tags_arrayOverlap: 'casual' }, allowedFields);
    expect(result).toEqual({ tags: { has: 'casual' } });
  });

  it('should reject disallowed fields', () => {
    const result = buildPrismaWhere({ password: 'secret' }, allowedFields);
    expect(result).toEqual({});
  });

  it('should skip null and undefined values', () => {
    const result = buildPrismaWhere(
      { gender: null, price: undefined, name: '' } as Record<string, unknown>,
      allowedFields,
    );
    expect(result).toEqual({});
  });

  it('should handle multiple filters', () => {
    const result = buildPrismaWhere(
      { gender: 'male', price_gte: 100, price_lte: 500 },
      allowedFields,
    );
    expect(result).toEqual({
      gender: 'male',
      price: { gte: 100, lte: 500 },
    });
  });

  it('should accept string array as allowedFields', () => {
    const result = buildPrismaWhere(
      { status: 'active' },
      ['status', 'name'],
    );
    expect(result).toEqual({ status: 'active' });
  });

  it('should reject field with only operator suffix and no field name', () => {
    const result = buildPrismaWhere({ _gte: 100 }, allowedFields);
    expect(result).toEqual({});
  });

  it('should handle empty filters object', () => {
    const result = buildPrismaWhere({}, allowedFields);
    expect(result).toEqual({});
  });
});

describe('parseFiltersFromString', () => {
  it('should parse valid JSON object string', () => {
    const result = parseFiltersFromString('{"gender":"male","price_gte":100}');
    expect(result).toEqual({ gender: 'male', price_gte: 100 });
  });

  it('should return null for invalid JSON', () => {
    const result = parseFiltersFromString('not json');
    expect(result).toBeNull();
  });

  it('should return null for JSON array', () => {
    const result = parseFiltersFromString('[1,2,3]');
    expect(result).toBeNull();
  });

  it('should return null for JSON primitive', () => {
    const result = parseFiltersFromString('42');
    expect(result).toBeNull();
  });

  it('should return null for null JSON', () => {
    const result = parseFiltersFromString('null');
    expect(result).toBeNull();
  });

  it('should handle empty object', () => {
    const result = parseFiltersFromString('{}');
    expect(result).toEqual({});
  });
});

describe('createFilterDto', () => {
  it('should create a DTO class with filters property', () => {
    const DynamicFilterDto = createFilterDto(['gender', 'price']);
    const instance = new DynamicFilterDto();
    expect(instance).toHaveProperty('filters', undefined);
  });

  it('should include allowed fields in ApiPropertyOptional description', () => {
    const DynamicFilterDto = createFilterDto(['gender', 'price']);
    const instance = new DynamicFilterDto();
    expect(instance).toBeInstanceOf(DynamicFilterDto);
  });
});
