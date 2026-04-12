import {
  transactionWithRetry,
  softDeleteFilter,
  excludeFields,
} from '../utils/prisma.util';

describe('transactionWithRetry', () => {
  it('should return result on first successful attempt', async () => {
    const fn = jest.fn().mockResolvedValue('success');
    const result = await transactionWithRetry(fn);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on P2034 error and succeed', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce({ code: 'P2034', message: 'Transaction failed' })
      .mockResolvedValueOnce('success');

    const result = await transactionWithRetry(fn, 3);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should retry on P2037 error and succeed', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce({ code: 'P2037', message: 'Write conflict' })
      .mockResolvedValueOnce('success');

    const result = await transactionWithRetry(fn, 3);
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should throw after max retries exceeded', async () => {
    const error = { code: 'P2034', message: 'Transaction failed' };
    const fn = jest.fn().mockRejectedValue(error);

    await expect(transactionWithRetry(fn, 2)).rejects.toEqual(error);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('should throw immediately on non-retryable error', async () => {
    const error = { code: 'P2002', message: 'Unique constraint failed' };
    const fn = jest.fn().mockRejectedValue(error);

    await expect(transactionWithRetry(fn, 3)).rejects.toEqual(error);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should throw on error without code', async () => {
    const error = new Error('Unknown error');
    const fn = jest.fn().mockRejectedValue(error);

    await expect(transactionWithRetry(fn, 3)).rejects.toThrow('Unknown error');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should use default maxRetries of 3', async () => {
    const error = { code: 'P2034', message: 'Transaction failed' };
    const fn = jest.fn().mockRejectedValue(error);

    await expect(transactionWithRetry(fn)).rejects.toEqual(error);
    expect(fn).toHaveBeenCalledTimes(3);
  });
});

describe('softDeleteFilter', () => {
  it('should return { deletedAt: null } condition', () => {
    const result = softDeleteFilter();
    expect(result).toEqual({ deletedAt: null });
  });
});

describe('excludeFields', () => {
  it('should exclude specified fields from object', () => {
    const model = {
      id: '123',
      name: 'test',
      passwordHash: 'hashed',
      email: 'test@test.com',
    };

    const result = excludeFields(model, ['passwordHash']);
    expect(result).toEqual({
      id: '123',
      name: 'test',
      email: 'test@test.com',
    });
  });

  it('should exclude multiple fields', () => {
    const model = {
      id: '123',
      passwordHash: 'hashed',
      email: 'test@test.com',
      internal: true,
    };

    const result = excludeFields(model, ['passwordHash', 'internal']);
    expect(result).toEqual({
      id: '123',
      email: 'test@test.com',
    });
  });

  it('should return all fields when exclusion list is empty', () => {
    const model = { id: '123', name: 'test' };
    const result = excludeFields(model, []);
    expect(result).toEqual({ id: '123', name: 'test' });
  });

  it('should handle non-existent fields in exclusion list gracefully', () => {
    const model = { id: '123', name: 'test' };
    const result = excludeFields(model, ['nonExistent']);
    expect(result).toEqual({ id: '123', name: 'test' });
  });

  it('should handle empty model object', () => {
    const model = {};
    const result = excludeFields(model, ['password']);
    expect(result).toEqual({});
  });

  it('should preserve nested objects', () => {
    const model = {
      id: '123',
      metadata: { key: 'value' },
      secret: 'hidden',
    };
    const result = excludeFields(model, ['secret']);
    expect(result).toEqual({
      id: '123',
      metadata: { key: 'value' },
    });
  });
});
