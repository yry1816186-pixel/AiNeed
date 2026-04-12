import { MockEmbeddingProvider } from '../providers/mock-embedding.provider';

describe('MockEmbeddingProvider', () => {
  let provider: MockEmbeddingProvider;

  beforeEach(() => {
    provider = new MockEmbeddingProvider();
  });

  describe('embed', () => {
    it('should return a normalized vector of correct dimensions', async () => {
      const result = await provider.embed('test text');

      expect(result).toHaveLength(1024);

      // Check normalization: magnitude should be approximately 1
      const magnitude = Math.sqrt(result.reduce((sum, val) => sum + val * val, 0));
      expect(magnitude).toBeCloseTo(1, 5);
    });

    it('should return deterministic results for same input', async () => {
      const result1 = await provider.embed('same text');
      const result2 = await provider.embed('same text');

      expect(result1).toEqual(result2);
    });

    it('should return different results for different inputs', async () => {
      const result1 = await provider.embed('text one');
      const result2 = await provider.embed('text two');

      expect(result1).not.toEqual(result2);
    });

    it('should produce values between -1 and 1', async () => {
      const result = await provider.embed('bounds test');

      for (const val of result) {
        expect(val).toBeGreaterThanOrEqual(-1);
        expect(val).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('embedBatch', () => {
    it('should return vectors for all texts', async () => {
      const results = await provider.embedBatch(['text1', 'text2', 'text3']);

      expect(results).toHaveLength(3);
      for (const vec of results) {
        expect(vec).toHaveLength(1024);
      }
    });

    it('should return deterministic batch results', async () => {
      const texts = ['alpha', 'beta', 'gamma'];
      const results1 = await provider.embedBatch(texts);
      const results2 = await provider.embedBatch(texts);

      expect(results1).toEqual(results2);
    });

    it('should match individual embed calls for each text', async () => {
      const texts = ['solo1', 'solo2'];
      const batchResults = await provider.embedBatch(texts);
      const individual1 = await provider.embed('solo1');
      const individual2 = await provider.embed('solo2');

      expect(batchResults[0]).toEqual(individual1);
      expect(batchResults[1]).toEqual(individual2);
    });

    it('should handle empty array', async () => {
      const results = await provider.embedBatch([]);

      expect(results).toHaveLength(0);
    });

    it('should handle single text', async () => {
      const results = await provider.embedBatch(['only']);

      expect(results).toHaveLength(1);
      expect(results[0]).toHaveLength(1024);
    });
  });

  describe('getDimensions', () => {
    it('should return 1024', () => {
      expect(provider.getDimensions()).toBe(1024);
    });
  });

  describe('getModelName', () => {
    it('should return mock-embedding', () => {
      expect(provider.getModelName()).toBe('mock-embedding');
    });
  });
});
