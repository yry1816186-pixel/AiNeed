import { ciede2000, rgbToLab, hexToRgb, findHarmoniousColors, colorSimilarity } from './ciede2000';

describe('ciede2000', () => {
  describe('rgbToLab', () => {
    it('should convert white (255,255,255) to L≈100', () => {
      const result = rgbToLab({ r: 255, g: 255, b: 255 });
      expect(result.L).toBeCloseTo(100, 0);
      expect(Math.abs(result.a)).toBeLessThan(1);
      expect(Math.abs(result.b)).toBeLessThan(1);
    });

    it('should convert black (0,0,0) to L≈0', () => {
      const result = rgbToLab({ r: 0, g: 0, b: 0 });
      expect(result.L).toBeCloseTo(0, 0);
    });

    it('should convert red (255,0,0) with positive a*', () => {
      const result = rgbToLab({ r: 255, g: 0, b: 0 });
      expect(result.L).toBeGreaterThan(40);
      expect(result.a).toBeGreaterThan(50);
    });

    it('should convert green (0,128,0) with negative a*', () => {
      const result = rgbToLab({ r: 0, g: 128, b: 0 });
      expect(result.a).toBeLessThan(0);
    });

    it('should produce consistent results for same input', () => {
      const a = rgbToLab({ r: 128, g: 64, b: 200 });
      const b = rgbToLab({ r: 128, g: 64, b: 200 });
      expect(a.L).toBe(b.L);
      expect(a.a).toBe(b.a);
      expect(a.b).toBe(b.b);
    });
  });

  describe('ciede2000', () => {
    it('should return 0 for identical colors', () => {
      const lab = { L: 50, a: 10, b: 20 };
      expect(ciede2000(lab, lab)).toBeCloseTo(0, 10);
    });

    it('should return a large value for black vs white', () => {
      const black = { L: 0, a: 0, b: 0 };
      const white = { L: 100, a: 0, b: 0 };
      expect(ciede2000(black, white)).toBeGreaterThan(50);
    });

    it('should be approximately symmetric', () => {
      const lab1 = { L: 50, a: 20, b: -10 };
      const lab2 = { L: 55, a: 15, b: -5 };
      const forward = ciede2000(lab1, lab2);
      const backward = ciede2000(lab2, lab1);
      expect(forward).toBeCloseTo(backward, 5);
    });

    it('should return small value for similar colors', () => {
      const lab1 = { L: 50, a: 10, b: 20 };
      const lab2 = { L: 50, a: 12, b: 20 };
      expect(ciede2000(lab1, lab2)).toBeLessThan(5);
    });

    it('should return larger value for more different colors', () => {
      const base = { L: 50, a: 10, b: 20 };
      const near = { L: 52, a: 11, b: 21 };
      const far = { L: 70, a: 30, b: -20 };
      expect(ciede2000(base, near)).toBeLessThan(ciede2000(base, far));
    });

    it('should handle achromatic colors (a=0, b=0)', () => {
      const gray1 = { L: 50, a: 0, b: 0 };
      const gray2 = { L: 70, a: 0, b: 0 };
      const delta = ciede2000(gray1, gray2);
      expect(delta).toBeGreaterThan(0);
      expect(delta).toBeLessThan(30);
    });
  });

  describe('hexToRgb', () => {
    it('should convert #FF0000 to red', () => {
      const result = hexToRgb('#FF0000');
      expect(result.r).toBe(255);
      expect(result.g).toBe(0);
      expect(result.b).toBe(0);
    });

    it('should convert #000000 to black', () => {
      const result = hexToRgb('#000000');
      expect(result.r).toBe(0);
      expect(result.g).toBe(0);
      expect(result.b).toBe(0);
    });

    it('should return black for invalid hex', () => {
      const result = hexToRgb('invalid');
      expect(result.r).toBe(0);
      expect(result.g).toBe(0);
      expect(result.b).toBe(0);
    });
  });

  describe('colorSimilarity', () => {
    it('should return 1.0 for identical colors', () => {
      expect(colorSimilarity({ r: 128, g: 64, b: 200 }, { r: 128, g: 64, b: 200 })).toBeCloseTo(1.0, 5);
    });

    it('should return lower similarity for different colors', () => {
      const sim = colorSimilarity({ r: 255, g: 0, b: 0 }, { r: 0, g: 0, b: 255 });
      expect(sim).toBeLessThan(0.5);
    });
  });

  describe('findHarmoniousColors', () => {
    it('should filter by maxDelta', () => {
      const base = '#FF0000';
      const candidates = [
        { id: '1', hex: '#FF1010' }, // very similar red
        { id: '2', hex: '#00FF00' }, // very different green
        { id: '3', hex: '#FF3333' }, // similar red
      ];
      const result = findHarmoniousColors(base, candidates, 30);
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThan(3);
    });

    it('should sort by delta ascending', () => {
      const base = '#FF0000';
      const candidates = [
        { id: '1', hex: '#FF3333' },
        { id: '2', hex: '#FF1010' },
      ];
      const result = findHarmoniousColors(base, candidates, 30);
      if (result.length >= 2) {
        expect(result[0].delta).toBeLessThanOrEqual(result[1].delta);
      }
    });
  });
});