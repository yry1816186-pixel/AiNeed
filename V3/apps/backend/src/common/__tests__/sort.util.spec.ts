import {
  parseSort,
  parseSortToParams,
} from '../utils/sort.util';

describe('parseSort', () => {
  const allowedFields = new Set(['price', 'createdAt', 'name', 'likesCount']);

  it('should parse price_asc correctly', () => {
    const result = parseSort('price_asc', allowedFields);
    expect(result).toEqual({ price: 'asc' });
  });

  it('should parse createdAt_desc correctly', () => {
    const result = parseSort('createdAt_desc', allowedFields);
    expect(result).toEqual({ createdAt: 'desc' });
  });

  it('should parse name_asc correctly', () => {
    const result = parseSort('name_asc', allowedFields);
    expect(result).toEqual({ name: 'asc' });
  });

  it('should reject disallowed fields', () => {
    const result = parseSort('password_asc', allowedFields);
    expect(result).toEqual({ createdAt: 'desc' });
  });

  it('should reject invalid direction', () => {
    const result = parseSort('price_invalid', allowedFields);
    expect(result).toEqual({ createdAt: 'desc' });
  });

  it('should handle empty string by returning default sort', () => {
    const result = parseSort('', allowedFields);
    expect(result).toEqual({ createdAt: 'desc' });
  });

  it('should handle multiple sort fields separated by comma', () => {
    const result = parseSort('price_asc,createdAt_desc', allowedFields);
    expect(result).toEqual({ price: 'asc', createdAt: 'desc' });
  });

  it('should skip invalid fields in multi-sort and keep valid ones', () => {
    const result = parseSort('price_asc,hacked_desc,name_asc', allowedFields);
    expect(result).toEqual({ price: 'asc', name: 'asc' });
  });

  it('should accept string array as allowedFields', () => {
    const result = parseSort('price_asc', ['price', 'name']);
    expect(result).toEqual({ price: 'asc' });
  });

  it('should handle field name with underscores', () => {
    const fields = new Set(['created_at', 'updated_at']);
    const result = parseSort('created_at_desc', fields);
    expect(result).toEqual({ created_at: 'desc' });
  });

  it('should return default sort when all fields are rejected', () => {
    const result = parseSort('foo_asc,bar_desc', allowedFields);
    expect(result).toEqual({ createdAt: 'desc' });
  });

  it('should handle sort string with only direction suffix', () => {
    const result = parseSort('_asc', allowedFields);
    expect(result).toEqual({ createdAt: 'desc' });
  });

  it('should handle whitespace in sort string', () => {
    const result = parseSort('  price_asc , name_desc  ', allowedFields);
    expect(result).toEqual({ price: 'asc', name: 'desc' });
  });
});

describe('parseSortToParams', () => {
  const allowedFields = new Set(['price', 'createdAt', 'name']);

  it('should return SortParams array for valid sort string', () => {
    const result = parseSortToParams('price_asc,name_desc', allowedFields);
    expect(result).toEqual([
      { field: 'price', direction: 'asc' },
      { field: 'name', direction: 'desc' },
    ]);
  });

  it('should return default for empty string', () => {
    const result = parseSortToParams('', allowedFields);
    expect(result).toEqual([{ field: 'createdAt', direction: 'desc' }]);
  });

  it('should filter out disallowed fields', () => {
    const result = parseSortToParams('price_asc,evil_desc', allowedFields);
    expect(result).toEqual([{ field: 'price', direction: 'asc' }]);
  });
});
