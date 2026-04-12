import { MockContentReviewProvider } from './mock-content-review.provider';

describe('MockContentReviewProvider', () => {
  let provider: MockContentReviewProvider;

  beforeEach(() => {
    provider = new MockContentReviewProvider();
  });

  const makeInput = (overrides: Partial<{ name: string; tags: string[]; designData: Record<string, unknown> }> = {}) => ({
    designId: 'design-001',
    name: overrides.name ?? 'Cool T-shirt',
    designData: overrides.designData ?? { color: 'blue' },
    patternImageUrl: null,
    tags: overrides.tags ?? [],
  });

  // ---------------------------------------------------------------
  // Branch: approved (no sensitive or brand keywords)
  // ---------------------------------------------------------------
  it('approves content with no sensitive or brand keywords', async () => {
    const result = await provider.review(makeInput());
    expect(result.verdict).toBe('approved');
    expect(result.confidence).toBe(0.95);
    expect(result.reasons).toEqual([]);
    expect(result.categories).toEqual([]);
  });

  // ---------------------------------------------------------------
  // Branch: sensitive_content keywords trigger rejection
  // ---------------------------------------------------------------
  it('rejects content containing sensitive keyword in name', async () => {
    const result = await provider.review(makeInput({ name: '暴力图案设计' }));
    expect(result.verdict).toBe('rejected');
    expect(result.confidence).toBe(0.92);
    expect(result.reasons).toEqual(
      expect.arrayContaining([expect.stringContaining('暴力')]),
    );
    expect(result.categories).toContain('sensitive_content');
  });

  it('rejects content containing sensitive keyword in tags', async () => {
    const result = await provider.review(makeInput({ tags: ['色情', 'hot'] }));
    expect(result.verdict).toBe('rejected');
    expect(result.categories).toContain('sensitive_content');
  });

  it('rejects content containing sensitive keyword in designData values', async () => {
    const result = await provider.review(
      makeInput({ designData: { desc: '政治主题设计' } }),
    );
    expect(result.verdict).toBe('rejected');
    expect(result.categories).toContain('sensitive_content');
  });

  // Multiple sensitive keywords
  it('accumulates multiple sensitive keyword reasons', async () => {
    const result = await provider.review(makeInput({ name: '暴力与毒品' }));
    expect(result.verdict).toBe('rejected');
    expect(result.reasons.length).toBeGreaterThanOrEqual(2);
    expect(result.categories.filter((c) => c === 'sensitive_content').length).toBe(result.reasons.length);
  });

  // ---------------------------------------------------------------
  // Branch: copyright / brand keywords trigger suspicious
  // ---------------------------------------------------------------
  it('marks content as suspicious for brand keyword in name', async () => {
    const result = await provider.review(makeInput({ name: 'Nike Air Max' }));
    expect(result.verdict).toBe('suspicious');
    expect(result.confidence).toBe(0.78);
    expect(result.reasons).toEqual(
      expect.arrayContaining([expect.stringContaining('nike')]),
    );
    expect(result.categories).toContain('copyright');
    expect(result.categories).not.toContain('sensitive_content');
  });

  it('marks content as suspicious for Chinese brand keyword', async () => {
    const result = await provider.review(makeInput({ name: '耐克联名款' }));
    expect(result.verdict).toBe('suspicious');
    expect(result.categories).toContain('copyright');
  });

  it('accumulates multiple brand keyword reasons', async () => {
    const result = await provider.review(makeInput({ name: 'Nike x Adidas' }));
    expect(result.verdict).toBe('suspicious');
    expect(result.reasons.length).toBeGreaterThanOrEqual(2);
  });

  // ---------------------------------------------------------------
  // Branch priority: sensitive_content takes precedence over copyright
  // ---------------------------------------------------------------
  it('rejects when both sensitive and brand keywords are present', async () => {
    const result = await provider.review(makeInput({ name: '暴力 Nike 设计' }));
    expect(result.verdict).toBe('rejected');
    expect(result.categories).toContain('sensitive_content');
    expect(result.categories).toContain('copyright');
  });

  // ---------------------------------------------------------------
  // Branch: case-insensitive keyword matching
  // ---------------------------------------------------------------
  it('matches keywords case-insensitively', async () => {
    const result = await provider.review(makeInput({ name: 'VIOLENCE design' }));
    expect(result.verdict).toBe('rejected');
    expect(result.categories).toContain('sensitive_content');
  });

  it('matches brand keywords case-insensitively', async () => {
    const result = await provider.review(makeInput({ name: 'GUCCI style' }));
    expect(result.verdict).toBe('suspicious');
    expect(result.categories).toContain('copyright');
  });

  // ---------------------------------------------------------------
  // Branch: keyword found inside designData value converted to string
  // ---------------------------------------------------------------
  it('detects sensitive keyword when designData value is not a string', async () => {
    const result = await provider.review(
      makeInput({ designData: { level: 42, note: null, tag: '赌博' } }),
    );
    expect(result.verdict).toBe('rejected');
    expect(result.categories).toContain('sensitive_content');
  });

  // ---------------------------------------------------------------
  // Branch: keyword in tags array
  // ---------------------------------------------------------------
  it('detects brand keyword inside tags', async () => {
    const result = await provider.review(makeInput({ tags: ['supreme', 'streetwear'] }));
    expect(result.verdict).toBe('suspicious');
    expect(result.categories).toContain('copyright');
  });
});
