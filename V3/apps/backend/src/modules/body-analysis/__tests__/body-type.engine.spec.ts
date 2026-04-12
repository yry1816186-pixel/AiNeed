import { analyzeBodyType, BODY_TYPE_DATA } from '../engine/body-type.engine';

describe('Body Type Engine', () => {
  describe('analyzeBodyType', () => {
    it('should return hourglass for balanced female proportions', () => {
      const result = analyzeBodyType({
        height: 165,
        weight: 55,
        shoulderWidth: 38,
        waist: 65,
        hip: 90,
        gender: 'female',
      });

      expect(result.type).toBe('hourglass');
      expect(result.label).toBe('沙漏形');
      expect(result.description).toBeTruthy();
      expect(result.suitableStyles.length).toBeGreaterThan(0);
      expect(result.avoidStyles.length).toBeGreaterThan(0);
      expect(result.colorSeason).toBe('spring');
    });

    it('should return pear for narrow shoulders and wider hips', () => {
      const result = analyzeBodyType({
        height: 162,
        weight: 58,
        shoulderWidth: 34,
        waist: 70,
        hip: 98,
        gender: 'female',
      });

      expect(result.type).toBe('pear');
      expect(result.label).toBe('梨形');
    });

    it('should return apple for high waist-hip ratio', () => {
      const result = analyzeBodyType({
        height: 160,
        weight: 65,
        shoulderWidth: 38,
        waist: 85,
        hip: 95,
        gender: 'female',
      });

      expect(result.type).toBe('apple');
      expect(result.label).toBe('苹果形');
    });

    it('should return inverted_triangle for wide shoulders and narrow hips', () => {
      const result = analyzeBodyType({
        height: 168,
        weight: 60,
        shoulderWidth: 42,
        waist: 68,
        hip: 88,
        gender: 'female',
      });

      expect(result.type).toBe('inverted_triangle');
      expect(result.label).toBe('倒三角');
    });

    it('should return rectangle for similar shoulder-waist-hip', () => {
      const result = analyzeBodyType({
        height: 165,
        weight: 55,
        shoulderWidth: 36,
        waist: 72,
        hip: 88,
        gender: 'female',
      });

      expect(result.type).toBe('rectangle');
      expect(result.label).toBe('矩形');
    });

    it('should return inverted_triangle for athletic male build', () => {
      const result = analyzeBodyType({
        height: 178,
        weight: 75,
        shoulderWidth: 46,
        waist: 80,
        hip: 95,
        gender: 'male',
      });

      expect(result.type).toBe('inverted_triangle');
    });

    it('should return apple for high BMI male', () => {
      const result = analyzeBodyType({
        height: 170,
        weight: 90,
        shoulderWidth: 42,
        waist: 95,
        hip: 100,
        gender: 'male',
      });

      expect(result.type).toBe('apple');
    });

    it('should fall back to BMI-based analysis without full measurements', () => {
      const result = analyzeBodyType({
        height: 165,
        weight: 55,
        gender: 'female',
      });

      expect(result.type).toBeDefined();
      expect(['pear', 'apple', 'hourglass', 'rectangle', 'inverted_triangle']).toContain(result.type);
    });

    it('should return rectangle for underweight female without measurements', () => {
      const result = analyzeBodyType({
        height: 170,
        weight: 45,
        gender: 'female',
      });

      expect(result.type).toBe('rectangle');
    });

    it('should return hourglass for normal BMI female without measurements', () => {
      const result = analyzeBodyType({
        height: 165,
        weight: 55,
        gender: 'female',
      });

      expect(result.type).toBe('hourglass');
    });

    it('should return inverted_triangle for normal BMI male without measurements', () => {
      const result = analyzeBodyType({
        height: 178,
        weight: 72,
        gender: 'male',
      });

      expect(result.type).toBe('inverted_triangle');
    });

    it('should handle other gender same as female', () => {
      const result = analyzeBodyType({
        height: 165,
        weight: 55,
        shoulderWidth: 38,
        waist: 65,
        hip: 90,
        gender: 'other',
      });

      expect(result.type).toBe('hourglass');
    });

    it('should have complete data for all body types', () => {
      const types: Array<keyof typeof BODY_TYPE_DATA> = ['pear', 'apple', 'hourglass', 'rectangle', 'inverted_triangle'];

      for (const type of types) {
        const data = BODY_TYPE_DATA[type];
        expect(data.label).toBeTruthy();
        expect(data.description).toBeTruthy();
        expect(data.suitableStyles.length).toBeGreaterThan(0);
        expect(data.avoidStyles.length).toBeGreaterThan(0);
        expect(data.colorSeason).toBeTruthy();
      }
    });
  });
});
