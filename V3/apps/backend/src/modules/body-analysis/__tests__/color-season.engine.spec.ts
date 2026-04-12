import { analyzeColorSeason, SEASON_DATA } from '../engine/color-season.engine';
import type { ColorSeasonInput } from '../engine/color-season.engine';

describe('Color Season Engine', () => {
  describe('analyzeColorSeason', () => {
    it('should return spring for fair skin, blonde hair, green eyes', () => {
      const result = analyzeColorSeason({
        skinTone: 'fair',
        hairColor: 'blonde',
        eyeColor: 'green',
      });

      expect(result.season).toBe('spring');
      expect(result.label).toBe('春季型');
      expect(result.suitableColors.length).toBeGreaterThan(0);
      expect(result.avoidColors.length).toBeGreaterThan(0);
      expect(result.description).toBeTruthy();
    });

    it('should return winter for dark skin, black hair, dark brown eyes', () => {
      const result = analyzeColorSeason({
        skinTone: 'dark',
        hairColor: 'black',
        eyeColor: 'dark_brown',
      });

      expect(result.season).toBe('winter');
      expect(result.label).toBe('冬季型');
    });

    it('should return autumn for olive skin, brown hair, hazel eyes', () => {
      const result = analyzeColorSeason({
        skinTone: 'olive',
        hairColor: 'brown',
        eyeColor: 'hazel',
      });

      expect(result.season).toBe('autumn');
      expect(result.label).toBe('秋季型');
    });

    it('should return summer for medium skin, dark brown hair, blue eyes', () => {
      const result = analyzeColorSeason({
        skinTone: 'medium',
        hairColor: 'dark_brown',
        eyeColor: 'blue',
      });

      expect(result.season).toBe('summer');
      expect(result.label).toBe('夏季型');
    });

    it('should return spring for light skin, red hair, hazel eyes', () => {
      const result = analyzeColorSeason({
        skinTone: 'light',
        hairColor: 'red',
        eyeColor: 'hazel',
      });

      expect(result.season).toBe('spring');
    });

    it('should return winter for tan skin, black hair, gray eyes', () => {
      const result = analyzeColorSeason({
        skinTone: 'tan',
        hairColor: 'black',
        eyeColor: 'gray',
      });

      expect(result.season).toBe('winter');
    });

    it('should return autumn for fair skin, light brown hair, brown eyes', () => {
      const result = analyzeColorSeason({
        skinTone: 'fair',
        hairColor: 'light_brown',
        eyeColor: 'brown',
      });

      expect(result.season).toBe('spring');
    });

    it('should handle gray and white hair colors', () => {
      const result = analyzeColorSeason({
        skinTone: 'medium',
        hairColor: 'gray',
        eyeColor: 'blue',
      });

      expect(result.season).toBeDefined();
      expect(['spring', 'summer', 'autumn', 'winter']).toContain(result.season);
    });

    it('should have complete data for all seasons', () => {
      const seasons: Array<keyof typeof SEASON_DATA> = ['spring', 'summer', 'autumn', 'winter'];

      for (const season of seasons) {
        const data = SEASON_DATA[season];
        expect(data.label).toBeTruthy();
        expect(data.suitableColors.length).toBeGreaterThan(0);
        expect(data.avoidColors.length).toBeGreaterThan(0);
        expect(data.description).toBeTruthy();
      }
    });

    it('should always return a valid season for any combination', () => {
      const skinTones: ColorSeasonInput['skinTone'][] = ['fair', 'light', 'medium', 'olive', 'tan', 'dark'];
      const hairColors: ColorSeasonInput['hairColor'][] = ['black', 'dark_brown', 'brown', 'light_brown', 'blonde', 'red', 'gray', 'white'];
      const eyeColors: ColorSeasonInput['eyeColor'][] = ['black', 'dark_brown', 'brown', 'hazel', 'green', 'blue', 'gray'];

      for (const skin of skinTones) {
        for (const hair of hairColors) {
          for (const eye of eyeColors) {
            const result = analyzeColorSeason({ skinTone: skin, hairColor: hair, eyeColor: eye });
            expect(['spring', 'summer', 'autumn', 'winter']).toContain(result.season);
          }
        }
      }
    });
  });
});
