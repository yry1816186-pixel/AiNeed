import { theme } from "../../design-system/theme";
import { DesignTokens } from "../../design-system/theme/tokens/design-tokens";
import { useTheme } from '../../shared/contexts/ThemeContext';

describe("LegacyThemeCompat", () => {
  it("theme.colors.text returns string", () => {
    expect(typeof theme.colors.text).toBe("string");
    expect(theme.colors.text).toBe(DesignTokens.colors.text.primary);
  });

  it("theme.colors.primary returns string", () => {
    expect(typeof theme.colors.primary).toBe("string");
    expect(theme.colors.primary).toBe(DesignTokens.colors.brand.terracotta);
  });

  it("theme.colors.surface returns string", () => {
    expect(typeof theme.colors.surface).toBe("string");
    expect(theme.colors.surface).toBe(DesignTokens.colors.backgrounds.primary);
  });

  it("theme.colors.error returns string", () => {
    expect(typeof theme.colors.error).toBe("string");
    expect(theme.colors.error).toBe(DesignTokens.colors.semantic.error);
  });

  it("theme.colors.textPrimary returns string", () => {
    expect(typeof theme.colors.textPrimary).toBe("string");
    expect(theme.colors.textPrimary).toBe(DesignTokens.colors.text.primary);
  });

  it("theme.colors.background returns string", () => {
    expect(typeof theme.colors.background).toBe("string");
    expect(theme.colors.background).toBe(DesignTokens.colors.backgrounds.primary);
  });

  it("theme.typography exists", () => {
    expect(theme.typography).toBeDefined();
  });

  it("theme.spacing exists", () => {
    expect(theme.spacing).toBeDefined();
  });
});
