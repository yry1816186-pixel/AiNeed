import {
  buildOutfitPrompt,
  UserProfile,
  OUTFIT_PROMPT_EXAMPLES,
} from './outfit-prompt';

describe('outfit-prompt', () => {
  describe('buildOutfitPrompt', () => {
    const fullProfile: UserProfile = {
      bodyType: 'hourglass',
      height: 165,
      weight: 55,
      colorSeason: 'spring',
      gender: 'female',
      stylePreferences: ['casual', 'french'],
      colorPreferences: ['pink', 'white'],
      budgetRange: '500-1500',
      occasion: 'date',
      season: 'spring',
      ageRange: '25-30',
      skinTone: 'fair',
    };

    it('should build a Chinese prompt with full profile', () => {
      const result = buildOutfitPrompt(fullProfile, 'zh');

      expect(result).toContain('\u6c99\u6f0f\u578b');
      expect(result).toContain('165');
      expect(result).toContain('55');
      expect(result).toContain('spring');
      expect(result).toContain('\u5973');
      expect(result).toContain('casual\u3001french');
      expect(result).toContain('pink\u3001white');
      expect(result).toContain('500-1500');
      expect(result).toContain('date');
      expect(result).toContain('25-30');
    });

    it('should build an English prompt with full profile', () => {
      const result = buildOutfitPrompt(fullProfile, 'en');

      expect(result).toContain('Hourglass');
      expect(result).toContain('165');
      expect(result).toContain('55');
      expect(result).toContain('Female');
      // join uses Chinese separator even in English template
      expect(result).toContain('casual\u3001french');
    });

    it('should default to Chinese language', () => {
      const result = buildOutfitPrompt(fullProfile);
      expect(result).toContain('\u6c99\u6f0f\u578b');
    });

    it('should handle undefined bodyType (defaults to straight)', () => {
      const profile: UserProfile = { ...fullProfile, bodyType: undefined };
      const result = buildOutfitPrompt(profile, 'zh');
      expect(result).toContain('\u76f4\u7b52\u578b');
    });

    it('should handle undefined bodyType in English (defaults to Straight)', () => {
      const profile: UserProfile = { ...fullProfile, bodyType: undefined };
      const result = buildOutfitPrompt(profile, 'en');
      expect(result).toContain('Straight');
    });

    it('should handle unknown bodyType label (falls back to default)', () => {
      const profile: UserProfile = { ...fullProfile, bodyType: 'unknown_type' as UserProfile['bodyType'] };
      const result = buildOutfitPrompt(profile, 'zh');
      // Unknown body type falls back to the ?? default
      expect(result).toContain('\u76f4\u7b52\u578b');
    });

    it('should handle unknown bodyType label in English (falls back to Straight)', () => {
      const profile: UserProfile = { ...fullProfile, bodyType: 'unknown_type' as UserProfile['bodyType'] };
      const result = buildOutfitPrompt(profile, 'en');
      expect(result).toContain('Straight');
    });

    it('should handle unknown gender label (falls back to default)', () => {
      const profile: UserProfile = { ...fullProfile, gender: 'nonbinary' as UserProfile['gender'] };
      const result = buildOutfitPrompt(profile, 'zh');
      expect(result).toContain('\u5973');
    });

    it('should handle unknown gender label in English (falls back to Female)', () => {
      const profile: UserProfile = { ...fullProfile, gender: 'nonbinary' as UserProfile['gender'] };
      const result = buildOutfitPrompt(profile, 'en');
      expect(result).toContain('Female');
    });

    it('should handle undefined gender (defaults to female)', () => {
      const profile: UserProfile = { ...fullProfile, gender: undefined };
      const result = buildOutfitPrompt(profile, 'zh');
      expect(result).toContain('\u5973');
    });

    it('should handle undefined gender in English (defaults to Female)', () => {
      const profile: UserProfile = { ...fullProfile, gender: undefined };
      const result = buildOutfitPrompt(profile, 'en');
      expect(result).toContain('Female');
    });

    it('should handle male gender in Chinese', () => {
      const profile: UserProfile = { ...fullProfile, gender: 'male' };
      const result = buildOutfitPrompt(profile, 'zh');
      expect(result).toContain('\u7537');
    });

    it('should handle male gender in English', () => {
      const profile: UserProfile = { ...fullProfile, gender: 'male' };
      const result = buildOutfitPrompt(profile, 'en');
      expect(result).toContain('Male');
    });

    it('should handle other gender in Chinese', () => {
      const profile: UserProfile = { ...fullProfile, gender: 'other' };
      const result = buildOutfitPrompt(profile, 'zh');
      expect(result).toContain('\u5176\u4ed6');
    });

    it('should handle other gender in English', () => {
      const profile: UserProfile = { ...fullProfile, gender: 'other' };
      const result = buildOutfitPrompt(profile, 'en');
      expect(result).toContain('Other');
    });

    it('should handle undefined height (defaults to 165)', () => {
      const profile: UserProfile = { ...fullProfile, height: undefined };
      const result = buildOutfitPrompt(profile, 'zh');
      expect(result).toContain('165');
    });

    it('should handle undefined weight (defaults to 55)', () => {
      const profile: UserProfile = { ...fullProfile, weight: undefined };
      const result = buildOutfitPrompt(profile, 'zh');
      expect(result).toContain('55');
    });

    it('should handle undefined colorSeason in Chinese (shows placeholder)', () => {
      const profile: UserProfile = { ...fullProfile, colorSeason: undefined };
      const result = buildOutfitPrompt(profile, 'zh');
      expect(result).toContain('\u672a\u786e\u5b9a');
    });

    it('should handle undefined colorSeason in English (shows Undetermined)', () => {
      const profile: UserProfile = { ...fullProfile, colorSeason: undefined };
      const result = buildOutfitPrompt(profile, 'en');
      expect(result).toContain('Undetermined');
    });

    it('should handle undefined stylePreferences in Chinese (shows default)', () => {
      const profile: UserProfile = { ...fullProfile, stylePreferences: undefined };
      const result = buildOutfitPrompt(profile, 'zh');
      expect(result).toContain('\u7b80\u7ea6');
    });

    it('should handle undefined stylePreferences in English (shows Minimalist)', () => {
      const profile: UserProfile = { ...fullProfile, stylePreferences: undefined };
      const result = buildOutfitPrompt(profile, 'en');
      expect(result).toContain('Minimalist');
    });

    it('should handle undefined colorPreferences in Chinese (shows default)', () => {
      const profile: UserProfile = { ...fullProfile, colorPreferences: undefined };
      const result = buildOutfitPrompt(profile, 'zh');
      expect(result).toContain('\u4e0d\u9650');
    });

    it('should handle undefined colorPreferences in English (shows No preference)', () => {
      const profile: UserProfile = { ...fullProfile, colorPreferences: undefined };
      const result = buildOutfitPrompt(profile, 'en');
      expect(result).toContain('No preference');
    });

    it('should handle undefined budgetRange in Chinese (shows default)', () => {
      const profile: UserProfile = { ...fullProfile, budgetRange: undefined };
      const result = buildOutfitPrompt(profile, 'zh');
      expect(result).toContain('500-1500');
    });

    it('should handle undefined budgetRange in English (shows default with CNY)', () => {
      const profile: UserProfile = { ...fullProfile, budgetRange: undefined };
      const result = buildOutfitPrompt(profile, 'en');
      expect(result).toContain('500-1500 CNY');
    });

    it('should handle undefined occasion in Chinese (shows default)', () => {
      const profile: UserProfile = { ...fullProfile, occasion: undefined };
      const result = buildOutfitPrompt(profile, 'zh');
      expect(result).toContain('\u65e5\u5e38\u901a\u52e4');
    });

    it('should handle undefined occasion in English (shows Daily Commute)', () => {
      const profile: UserProfile = { ...fullProfile, occasion: undefined };
      const result = buildOutfitPrompt(profile, 'en');
      expect(result).toContain('Daily Commute');
    });

    it('should handle undefined season (defaults to spring)', () => {
      const profile: UserProfile = { ...fullProfile, season: undefined };
      const result = buildOutfitPrompt(profile, 'zh');
      expect(result).toContain('spring');
    });

    it('should handle undefined ageRange in Chinese (shows default)', () => {
      const profile: UserProfile = { ...fullProfile, ageRange: undefined };
      const result = buildOutfitPrompt(profile, 'zh');
      expect(result).toContain('25-35');
    });

    it('should handle undefined ageRange in English (shows default)', () => {
      const profile: UserProfile = { ...fullProfile, ageRange: undefined };
      const result = buildOutfitPrompt(profile, 'en');
      expect(result).toContain('25-35');
    });

    it('should handle completely empty profile with all defaults in Chinese', () => {
      const profile: UserProfile = {};
      const result = buildOutfitPrompt(profile, 'zh');
      expect(result).toContain('\u76f4\u7b52\u578b');
      expect(result).toContain('\u5973');
      expect(result).toContain('165');
      expect(result).toContain('55');
      expect(result).toContain('\u672a\u786e\u5b9a');
      expect(result).toContain('\u7b80\u7ea6');
    });

    it('should handle completely empty profile with all defaults in English', () => {
      const profile: UserProfile = {};
      const result = buildOutfitPrompt(profile, 'en');
      expect(result).toContain('Straight');
      expect(result).toContain('Female');
      expect(result).toContain('165');
      expect(result).toContain('55');
      expect(result).toContain('Undetermined');
      expect(result).toContain('Minimalist');
    });

    it('should replace all template placeholders in Chinese output', () => {
      const result = buildOutfitPrompt(fullProfile, 'zh');
      expect(result).not.toContain('{{gender}}');
      expect(result).not.toContain('{{bodyType}}');
      expect(result).not.toContain('{{height}}');
      expect(result).not.toContain('{{weight}}');
      expect(result).not.toContain('{{colorSeason}}');
      expect(result).not.toContain('{{stylePreferences}}');
      expect(result).not.toContain('{{colorPreferences}}');
      expect(result).not.toContain('{{budgetRange}}');
      expect(result).not.toContain('{{occasion}}');
      expect(result).not.toContain('{{season}}');
      expect(result).not.toContain('{{ageRange}}');
    });

    it('should replace all template placeholders in English output', () => {
      const result = buildOutfitPrompt(fullProfile, 'en');
      expect(result).not.toContain('{{gender}}');
      expect(result).not.toContain('{{bodyType}}');
      expect(result).not.toContain('{{height}}');
      expect(result).not.toContain('{{weight}}');
    });

    it('should handle each body type label in Chinese', () => {
      const bodyTypes: Array<UserProfile['bodyType']> = ['hourglass', 'pear', 'apple', 'straight', 'inverted_triangle'];
      const zhLabels = ['\u6c99\u6f0f\u578b', '\u68a8\u578b', '\u82f9\u679c\u578b', '\u76f4\u7b52\u578b', '\u5012\u4e09\u89d2\u578b'];

      for (let i = 0; i < bodyTypes.length; i++) {
        const profile: UserProfile = { ...fullProfile, bodyType: bodyTypes[i] };
        const result = buildOutfitPrompt(profile, 'zh');
        expect(result).toContain(zhLabels[i]);
      }
    });

    it('should handle each body type label in English', () => {
      const bodyTypes: Array<UserProfile['bodyType']> = ['hourglass', 'pear', 'apple', 'straight', 'inverted_triangle'];
      const enLabels = ['Hourglass', 'Pear', 'Apple', 'Straight', 'Inverted Triangle'];

      for (let i = 0; i < bodyTypes.length; i++) {
        const profile: UserProfile = { ...fullProfile, bodyType: bodyTypes[i] };
        const result = buildOutfitPrompt(profile, 'en');
        expect(result).toContain(enLabels[i]);
      }
    });

    it('should handle each season value', () => {
      const seasons: Array<UserProfile['season']> = ['spring', 'summer', 'autumn', 'winter'];
      for (const season of seasons) {
        const profile: UserProfile = { ...fullProfile, season };
        const result = buildOutfitPrompt(profile, 'zh');
        expect(result).toContain(season);
      }
    });
  });

  describe('OUTFIT_PROMPT_EXAMPLES', () => {
    it('should be an array of example scenarios', () => {
      expect(OUTFIT_PROMPT_EXAMPLES).toBeInstanceOf(Array);
      expect(OUTFIT_PROMPT_EXAMPLES.length).toBe(3);
    });

    it('should have all required fields in each example', () => {
      for (const example of OUTFIT_PROMPT_EXAMPLES) {
        expect(example).toHaveProperty('scenario');
        expect(example).toHaveProperty('profile');
        expect(example).toHaveProperty('description');
        expect(example.profile).toHaveProperty('gender');
        expect(example.profile).toHaveProperty('bodyType');
      }
    });
  });
});
