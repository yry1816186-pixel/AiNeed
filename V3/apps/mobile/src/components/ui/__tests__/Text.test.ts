import { colors } from '../../../theme/colors';
import { typography } from '../../../theme/typography';

describe('Text Component Logic', () => {
  describe('variant styles', () => {
    it('should have correct h1 typography', () => {
      expect(typography.h1.fontSize).toBe(24);
      expect(typography.h1.fontWeight).toBe('700');
      expect(typography.h1.lineHeight).toBe(32);
    });

    it('should have correct h2 typography', () => {
      expect(typography.h2.fontSize).toBe(20);
      expect(typography.h2.fontWeight).toBe('600');
      expect(typography.h2.lineHeight).toBe(28);
    });

    it('should have correct h3 typography', () => {
      expect(typography.h3.fontSize).toBe(18);
      expect(typography.h3.fontWeight).toBe('600');
      expect(typography.h3.lineHeight).toBe(24);
    });

    it('should have correct body typography', () => {
      expect(typography.body.fontSize).toBe(15);
      expect(typography.body.fontWeight).toBe('400');
      expect(typography.body.lineHeight).toBe(22);
    });

    it('should have correct caption typography', () => {
      expect(typography.caption.fontSize).toBe(12);
      expect(typography.caption.fontWeight).toBe('400');
      expect(typography.caption.lineHeight).toBe(16);
    });

    it('should have correct overline typography', () => {
      expect(typography.overline.fontSize).toBe(11);
      expect(typography.overline.fontWeight).toBe('500');
      expect(typography.overline.letterSpacing).toBe(1);
    });
  });

  describe('color mapping', () => {
    it('should use textPrimary for default color', () => {
      const defaultColor = colors.textPrimary;
      expect(defaultColor).toBe('#1A1A1A');
    });

    it('should use textSecondary for secondary color', () => {
      const secondaryColor = colors.textSecondary;
      expect(secondaryColor).toBe('#666666');
    });

    it('should use textTertiary for tertiary color', () => {
      const tertiaryColor = colors.textTertiary;
      expect(tertiaryColor).toBe('#999999');
    });

    it('should use textInverse for inverse color', () => {
      const inverseColor = colors.textInverse;
      expect(inverseColor).toBe('#FFFFFF');
    });

    it('should use accent for accent color', () => {
      const accentColor = colors.accent;
      expect(accentColor).toBe('#E94560');
    });

    it('should use error for error color', () => {
      const errorColor = colors.error;
      expect(errorColor).toBe('#F44336');
    });
  });

  describe('line height consistency', () => {
    it('should have lineHeight >= fontSize * 1.2 for all variants', () => {
      for (const [key, style] of Object.entries(typography)) {
        const ratio = style.lineHeight / style.fontSize;
        expect(ratio).toBeGreaterThanOrEqual(1.2);
      }
    });
  });
});
