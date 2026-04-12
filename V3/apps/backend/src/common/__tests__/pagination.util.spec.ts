import { PaginationDto } from '../dto/pagination.dto';
import {
  resolvePagination,
  buildPaginationMeta,
} from '../utils/pagination.util';

describe('PaginationDto', () => {
  it('should have default values', () => {
    const dto = new PaginationDto();
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
  });

  it('should allow setting page and limit', () => {
    const dto = new PaginationDto();
    dto.page = 3;
    dto.limit = 50;
    expect(dto.page).toBe(3);
    expect(dto.limit).toBe(50);
  });
});

describe('resolvePagination', () => {
  it('should return correct skip and take for page 1, limit 20', () => {
    const result = resolvePagination({ page: 1, limit: 20 });
    expect(result.skip).toBe(0);
    expect(result.take).toBe(20);
  });

  it('should return correct skip and take for page 3, limit 10', () => {
    const result = resolvePagination({ page: 3, limit: 10 });
    expect(result.skip).toBe(20);
    expect(result.take).toBe(10);
  });

  it('should handle page=0 by clamping to 1', () => {
    const result = resolvePagination({ page: 0, limit: 20 });
    expect(result.skip).toBe(0);
    expect(result.take).toBe(20);
  });

  it('should handle limit=0 by clamping to 1', () => {
    const result = resolvePagination({ page: 1, limit: 0 });
    expect(result.skip).toBe(0);
    expect(result.take).toBe(1);
  });

  it('should handle limit exceeding 100 by clamping to 100', () => {
    const result = resolvePagination({ page: 1, limit: 200 });
    expect(result.skip).toBe(0);
    expect(result.take).toBe(100);
  });

  it('should handle negative page by clamping to 1', () => {
    const result = resolvePagination({ page: -5, limit: 10 });
    expect(result.skip).toBe(0);
    expect(result.take).toBe(10);
  });

  it('should handle negative limit by clamping to 1', () => {
    const result = resolvePagination({ page: 1, limit: -10 });
    expect(result.skip).toBe(0);
    expect(result.take).toBe(1);
  });

  it('should handle very large page number', () => {
    const result = resolvePagination({ page: 999999, limit: 20 });
    expect(result.skip).toBe(999998 * 20);
    expect(result.take).toBe(20);
  });

  it('should use defaults when values are undefined', () => {
    const result = resolvePagination({});
    expect(result.skip).toBe(0);
    expect(result.take).toBe(20);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });
});

describe('buildPaginationMeta', () => {
  it('should return correct meta for total=100, page=1, limit=20', () => {
    const meta = buildPaginationMeta(100, 1, 20);
    expect(meta).toEqual({
      total: 100,
      page: 1,
      limit: 20,
      totalPages: 5,
    });
  });

  it('should return totalPages=0 when total=0', () => {
    const meta = buildPaginationMeta(0, 1, 20);
    expect(meta).toEqual({
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
  });

  it('should handle partial last page', () => {
    const meta = buildPaginationMeta(45, 3, 20);
    expect(meta).toEqual({
      total: 45,
      page: 3,
      limit: 20,
      totalPages: 3,
    });
  });

  it('should handle total exactly divisible by limit', () => {
    const meta = buildPaginationMeta(100, 1, 25);
    expect(meta).toEqual({
      total: 100,
      page: 1,
      limit: 25,
      totalPages: 4,
    });
  });
});
