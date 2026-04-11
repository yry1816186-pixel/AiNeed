import { colors, type ColorToken } from './colors';
import { typography, type TypographyVariant, type TypographyVariantKey } from './typography';
import { spacing, type SpacingKey } from './spacing';
import { shadows, type ShadowKey } from './shadows';
import { radius, type RadiusKey } from './radius';

export interface Theme {
  colors: typeof colors;
  typography: typeof typography;
  spacing: typeof spacing;
  shadows: typeof shadows;
  radius: typeof radius;
}

export type { ColorToken, TypographyVariant, TypographyVariantKey, SpacingKey, ShadowKey, RadiusKey };

export const defaultTheme: Theme = {
  colors,
  typography,
  spacing,
  shadows,
  radius,
};

let currentTheme: Theme = defaultTheme;

export function getTheme(): Theme {
  return currentTheme;
}

export function createTheme(overrides: Partial<Theme> = {}): Theme {
  return {
    colors: overrides.colors ?? currentTheme.colors,
    typography: overrides.typography ?? currentTheme.typography,
    spacing: overrides.spacing ?? currentTheme.spacing,
    shadows: overrides.shadows ?? currentTheme.shadows,
    radius: overrides.radius ?? currentTheme.radius,
  };
}

export function setTheme(theme: Theme): void {
  currentTheme = theme;
}

export { colors, typography, spacing, shadows, radius };
