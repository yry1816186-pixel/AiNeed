import { encodeCursor, decodeCursor, isValidCursor, CursorDecodeError, CursorData } from './cursor';

describe('CursorUtils', () => {
  describe('encodeCursor', () => {
    it('encodes a cursor with string lastValue correctly', () => {
      const data: CursorData = { sortField: 'createdAt', lastValue: '2024-01-01', direction: 'asc' };
      const result = encodeCursor(data);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('encodes a cursor with numeric lastValue correctly', () => {
      const data: CursorData = { sortField: 'id', lastValue: 42, direction: 'desc' };
      const result = encodeCursor(data);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('produces Base64URL output with no +, /, or = characters', () => {
      const data: CursorData = { sortField: 'field', lastValue: 'value+with/special=chars==', direction: 'asc' };
      const result = encodeCursor(data);
      expect(result).not.toContain('+');
      expect(result).not.toContain('/');
      expect(result).not.toContain('=');
    });

    it('produces deterministic output for same input', () => {
      const data: CursorData = { sortField: 'createdAt', lastValue: '2024-01-01', direction: 'asc' };
      const result1 = encodeCursor(data);
      const result2 = encodeCursor(data);
      expect(result1).toBe(result2);
    });

    it('handles empty string sortField', () => {
      const data: CursorData = { sortField: '', lastValue: 'value', direction: 'asc' };
      const result = encodeCursor(data);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('handles direction asc', () => {
      const data: CursorData = { sortField: 'id', lastValue: 1, direction: 'asc' };
      const result = encodeCursor(data);
      const decoded = decodeCursor(result);
      expect(decoded.direction).toBe('asc');
    });

    it('handles direction desc', () => {
      const data: CursorData = { sortField: 'id', lastValue: 1, direction: 'desc' };
      const result = encodeCursor(data);
      const decoded = decodeCursor(result);
      expect(decoded.direction).toBe('desc');
    });
  });

  describe('decodeCursor', () => {
    it('decodes a valid cursor back to original data with string lastValue', () => {
      const data: CursorData = { sortField: 'createdAt', lastValue: '2024-01-01', direction: 'asc' };
      const encoded = encodeCursor(data);
      const decoded = decodeCursor(encoded);
      expect(decoded).toEqual(data);
    });

    it('decodes a valid cursor back to original data with numeric lastValue', () => {
      const data: CursorData = { sortField: 'id', lastValue: 42, direction: 'desc' };
      const encoded = encodeCursor(data);
      const decoded = decodeCursor(encoded);
      expect(decoded).toEqual(data);
    });

    it('round-trip preserves data through encode then decode', () => {
      const data: CursorData = { sortField: 'updatedAt', lastValue: 99, direction: 'asc' };
      expect(decodeCursor(encodeCursor(data))).toEqual(data);
    });

    it('throws CursorDecodeError for invalid Base64URL', () => {
      expect(() => decodeCursor('!!!invalid!!!')).toThrow(CursorDecodeError);
    });

    it('throws CursorDecodeError for valid Base64URL but invalid JSON', () => {
      const invalidJsonBase64 = Buffer.from('{not valid json}', 'utf-8').toString('base64');
      const base64url = invalidJsonBase64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      expect(() => decodeCursor(base64url)).toThrow(CursorDecodeError);
    });

    it('throws CursorDecodeError for valid JSON but missing sortField', () => {
      const payload = JSON.stringify({ lastValue: 'val', direction: 'asc' });
      const base64url = Buffer.from(payload, 'utf-8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      expect(() => decodeCursor(base64url)).toThrow(CursorDecodeError);
    });

    it('throws CursorDecodeError for valid JSON but missing lastValue', () => {
      const payload = JSON.stringify({ sortField: 'id', direction: 'asc' });
      const base64url = Buffer.from(payload, 'utf-8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      expect(() => decodeCursor(base64url)).toThrow(CursorDecodeError);
    });

    it('throws CursorDecodeError for valid JSON but invalid direction', () => {
      const payload = JSON.stringify({ sortField: 'id', lastValue: 1, direction: 'invalid' });
      const base64url = Buffer.from(payload, 'utf-8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      expect(() => decodeCursor(base64url)).toThrow(CursorDecodeError);
    });

    it('CursorDecodeError has correct name property', () => {
      const error = new CursorDecodeError('test message');
      expect(error.name).toBe('CursorDecodeError');
    });

    it('CursorDecodeError preserves cause for non-CursorDecodeError exceptions', () => {
      try {
        decodeCursor('!!!invalid!!!');
        fail('Expected CursorDecodeError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(CursorDecodeError);
        if (error instanceof CursorDecodeError) {
          expect(error.cause).toBeDefined();
        }
      }
    });

    it('re-throws CursorDecodeError without wrapping it', () => {
      const payload = JSON.stringify({ sortField: 'id', lastValue: 1, direction: 'invalid' });
      const base64url = Buffer.from(payload, 'utf-8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      try {
        decodeCursor(base64url);
        fail('Expected CursorDecodeError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(CursorDecodeError);
        if (error instanceof CursorDecodeError) {
          expect(error.message).toBe('Invalid cursor data structure');
          expect(error.cause).toBeUndefined();
        }
      }
    });

    it('throws CursorDecodeError for valid JSON with lastValue as boolean', () => {
      const payload = JSON.stringify({ sortField: 'id', lastValue: true, direction: 'asc' });
      const base64url = Buffer.from(payload, 'utf-8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      expect(() => decodeCursor(base64url)).toThrow(CursorDecodeError);
    });

    it('throws CursorDecodeError for valid JSON with lastValue as null', () => {
      const payload = JSON.stringify({ sortField: 'id', lastValue: null, direction: 'asc' });
      const base64url = Buffer.from(payload, 'utf-8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      expect(() => decodeCursor(base64url)).toThrow(CursorDecodeError);
    });

    it('throws CursorDecodeError for valid JSON with sortField as number', () => {
      const payload = JSON.stringify({ sortField: 123, lastValue: 'val', direction: 'asc' });
      const base64url = Buffer.from(payload, 'utf-8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      expect(() => decodeCursor(base64url)).toThrow(CursorDecodeError);
    });
  });

  describe('isValidCursor', () => {
    it('returns true for valid cursor', () => {
      const data: CursorData = { sortField: 'createdAt', lastValue: '2024-01-01', direction: 'asc' };
      expect(isValidCursor(encodeCursor(data))).toBe(true);
    });

    it('returns false for invalid cursor', () => {
      expect(isValidCursor('!!!invalid!!!')).toBe(false);
    });

    it('returns false for empty string', () => {
      expect(isValidCursor('')).toBe(false);
    });

    it('returns false for random string', () => {
      expect(isValidCursor('randomstring12345')).toBe(false);
    });

    it('returns true for round-trip encoded cursor', () => {
      const data: CursorData = { sortField: 'id', lastValue: 100, direction: 'desc' };
      expect(isValidCursor(encodeCursor(data))).toBe(true);
    });
  });
});
