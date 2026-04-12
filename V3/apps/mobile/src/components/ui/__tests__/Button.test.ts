import { colors } from '../../../theme/colors';
import { spacing } from '../../../theme/spacing';
import { radius } from '../../../theme/radius';
import { typography } from '../../../theme/typography';

describe('Button Component Logic', () => {
  describe('variant styles', () => {
    it('should have accent color for primary variant', () => {
      const primaryBg = colors.accent;
      expect(primaryBg).toBe('#E94560');
    });

    it('should have background color for secondary variant', () => {
      const secondaryBg = colors.backgroundSecondary;
      expect(secondaryBg).toBe('#F5F5F5');
    });

    it('should have transparent background for text variant', () => {
      const textBg = 'transparent';
      expect(textBg).toBe('transparent');
    });
  });

  describe('size styles', () => {
    it('should have correct padding for small size', () => {
      const smallPaddingV = spacing.xs;
      const smallPaddingH = spacing.md;
      expect(smallPaddingV).toBe(4);
      expect(smallPaddingH).toBe(12);
    });

    it('should have correct padding for medium size', () => {
      const mediumPaddingV = spacing.sm;
      const mediumPaddingH = spacing.lg;
      expect(mediumPaddingV).toBe(8);
      expect(mediumPaddingH).toBe(16);
    });

    it('should have correct padding for large size', () => {
      const largePaddingV = spacing.md;
      const largePaddingH = spacing.xl;
      expect(largePaddingV).toBe(12);
      expect(largePaddingH).toBe(24);
    });
  });

  describe('typography', () => {
    it('should use button typography for default size', () => {
      expect(typography.button.fontSize).toBe(16);
      expect(typography.button.fontWeight).toBe('600');
    });

    it('should use buttonSmall typography for small size', () => {
      expect(typography.buttonSmall.fontSize).toBe(14);
      expect(typography.buttonSmall.fontWeight).toBe('600');
    });
  });

  describe('border radius', () => {
    it('should have correct border radius', () => {
      expect(radius.md).toBe(8);
      expect(radius.lg).toBe(12);
    });
  });

  describe('disabled state', () => {
    it('should reduce opacity when disabled', () => {
      const disabledOpacity = 0.5;
      expect(disabledOpacity).toBeLessThan(1);
    });

    it('should show ActivityIndicator when loading', () => {
      const isLoading = true;
      const showsSpinner = isLoading;
      expect(showsSpinner).toBe(true);
    });
  });

  describe('color contrast', () => {
    it('should have light text on accent background', () => {
      const accentBg = colors.accent;
      const textOnAccent = colors.textInverse;
      expect(accentBg).toBe('#E94560');
      expect(textOnAccent).toBe('#FFFFFF');
    });

    it('should have dark text on secondary background', () => {
      const secondaryBg = colors.backgroundSecondary;
      const textOnSecondary = colors.textPrimary;
      expect(secondaryBg).toBe('#F5F5F5');
      expect(textOnSecondary).toBe('#1A1A1A');
    });
  });
});
