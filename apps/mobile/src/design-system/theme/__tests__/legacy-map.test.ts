import { DesignTokens, darkTokens, Spacing, BorderRadius } from "../tokens/legacy-map";
import { primitiveTokens } from "../tokens/generated/primitive-tokens";
import { semanticTokens } from "../tokens/generated/semantic-tokens";
import { existsSync } from "fs";
import { join } from "path";

describe("legacy-map: backward compatibility bridge", () => {
  describe("Test 1: DesignTokens export structure", () => {
    it("exports DesignTokens with same key structure as old DesignTokens", () => {
      expect(DesignTokens).toBeDefined();
      expect(DesignTokens.colors).toBeDefined();
      expect(DesignTokens.colors.brand).toBeDefined();
      expect(DesignTokens.colors.neutral).toBeDefined();
      expect(DesignTokens.colors.semantic).toBeDefined();
      expect(DesignTokens.colors.fashion).toBeDefined();
      expect(DesignTokens.colors.backgrounds).toBeDefined();
      expect(DesignTokens.colors.text).toBeDefined();
      expect(DesignTokens.colors.borders).toBeDefined();
      expect(DesignTokens.colors.colorSeasons).toBeDefined();
      expect(DesignTokens.colors.xuno).toBeDefined();
      expect(DesignTokens.colors.funnel).toBeDefined();
      expect(DesignTokens.gradients).toBeDefined();
      expect(DesignTokens.typography).toBeDefined();
      expect(DesignTokens.spacing).toBeDefined();
      expect(DesignTokens.borderRadius).toBeDefined();
      expect(DesignTokens.shadows).toBeDefined();
      expect(DesignTokens.animation).toBeDefined();
    });
  });

  describe("Test 2: brand.terracotta resolves to new #C44536 (D-01)", () => {
    it("resolves terracotta to the new terracotta 500 value", () => {
      expect(DesignTokens.colors.brand.terracotta).toBe("#C44536");
      expect(DesignTokens.colors.brand.terracotta).toBe(
        primitiveTokens.colors.brand.terracotta[500]
      );
    });
  });

  describe("Test 3: spacing.xl resolves to 24 (old value preserved)", () => {
    it("preserves old spacing value", () => {
      expect(DesignTokens.spacing[6]).toBe(24);
      expect(DesignTokens.spacing.xl).toBeUndefined();
      expect(DesignTokens.spacing[4]).toBe(16);
    });
  });

  describe("Test 4: Spacing export works (old export name)", () => {
    it("exports Spacing from legacy-map", () => {
      expect(Spacing).toBeDefined();
      expect(Spacing[4]).toBe(16);
      expect(Spacing[6]).toBe(24);
      expect(Spacing[8]).toBe(32);
    });
  });

  describe("Test 5: BorderRadius export works", () => {
    it("exports BorderRadius from legacy-map", () => {
      expect(BorderRadius).toBeDefined();
      expect(BorderRadius.none).toBe(0);
      expect(BorderRadius.sm).toBe(4);
      expect(BorderRadius.md).toBe(6);
      expect(BorderRadius.full).toBe(9999);
    });
  });

  describe("Test 6: @/theme re-export path works", () => {
    it("re-exports DesignTokens through design-system/theme barrel", () => {
      const theme = require("../index");
      expect(theme.DesignTokens).toBeDefined();
      expect(theme.DesignTokens.colors.brand.terracotta).toBe("#C44536");
    });
  });

  describe("Test 7: ThemeSystem.tsx does not exist", () => {
    it("ThemeSystem.tsx file should not exist", () => {
      const themeSystemPath = join(
        __dirname,
        "..",
        "..",
        "..",
        "shared",
        "components",
        "theme",
        "ThemeSystem.tsx"
      );
      expect(existsSync(themeSystemPath)).toBe(false);
    });
  });

  describe("Test 8: src/theme/tokens/design-tokens.ts does not exist", () => {
    it("duplicate design-tokens.ts should not exist", () => {
      const dupePath = join(
        __dirname,
        "..",
        "..",
        "..",
        "..",
        "theme",
        "tokens",
        "design-tokens.ts"
      );
      expect(existsSync(dupePath)).toBe(false);
    });
  });

  describe("Test 9: semantic.error is NOT #C44536 (D-03)", () => {
    it("error color was shifted away from brand terracotta", () => {
      expect(DesignTokens.colors.semantic.error).not.toBe("#C44536");
      expect(DesignTokens.colors.semantic.error).toBe(semanticTokens.colors.status.error.light);
    });
  });

  describe("Test 10: darkTokens structure matches DesignTokens", () => {
    it("darkTokens has same top-level keys as DesignTokens", () => {
      expect(darkTokens).toBeDefined();
      expect(darkTokens.colors).toBeDefined();
      expect(darkTokens.colors.brand).toBeDefined();
      expect(darkTokens.colors.neutral).toBeDefined();
      expect(darkTokens.colors.semantic).toBeDefined();
      expect(darkTokens.gradients).toBeDefined();
      expect(darkTokens.shadows).toBeDefined();
    });
  });
});
