import * as fs from "fs";
import * as path from "path";

const themeIndex = require("../index");
const { DesignTokens, darkTokens, Spacing, BorderRadius, Shadows, Typography, Animation, ZIndex } =
  themeIndex;

describe("Legacy Token Map", () => {
  describe("DesignTokens backward compatibility", () => {
    it("DesignTokens.colors.brand.terracotta is #C44536 (D-01)", () => {
      expect(DesignTokens.colors.brand.terracotta).toBe("#C44536");
    });

    it("DesignTokens.colors.semantic.error is NOT #C44536 (D-03)", () => {
      expect(DesignTokens.colors.semantic.error).not.toBe("#C44536");
      expect(DesignTokens.colors.semantic.error).toBe("#DC3545");
    });

    it("DesignTokens.spacing.6 resolves to 24", () => {
      expect(DesignTokens.spacing[6]).toBe(24);
    });

    it("DesignTokens.borderRadius.md resolves to 6", () => {
      expect(DesignTokens.borderRadius.md).toBe(6);
    });

    it("DesignTokens.colors.text.brand is #8A4E32 (WCAG AA fixed)", () => {
      expect(DesignTokens.colors.text.brand).toBe("#8A4E32");
    });

    it("DesignTokens.colors.borders.brand is #C44536 (D-01)", () => {
      expect(DesignTokens.colors.borders.brand).toBe("#C44536");
    });
  });

  describe("Named exports preserved", () => {
    it("Spacing export works", () => {
      expect(Spacing[4]).toBe(16);
    });

    it("BorderRadius export works", () => {
      expect(BorderRadius.lg).toBe(12);
    });

    it("Typography export works", () => {
      expect(Typography.sizes.md).toBe(16);
    });

    it("Shadows export works", () => {
      expect(Shadows.md.elevation).toBe(4);
    });

    it("Animation export works", () => {
      expect(Animation.duration.normal).toBe(300);
    });

    it("ZIndex export works", () => {
      expect(ZIndex.modal).toBe(1400);
    });
  });

  describe("Secondary import path (@/theme)", () => {
    it("DesignTokens available from @/theme via relative require", () => {
      const themeCompat = require("../../../theme");
      expect(themeCompat.DesignTokens.colors.brand.terracotta).toBe("#C44536");
    });

    it("darkTokens available from @/theme", () => {
      const themeCompat = require("../../../theme");
      expect(themeCompat.darkTokens.colors.brand.terracotta).toBeDefined();
    });
  });

  describe("Dark tokens", () => {
    it("darkTokens.colors.semantic.error is #D45546", () => {
      expect(darkTokens.colors.semantic.error).toBe("#D45546");
    });
  });

  describe("Deleted files", () => {
    it("src/theme/tokens/design-tokens.ts does NOT exist", () => {
      const filePath = path.resolve(
        __dirname,
        "..",
        "..",
        "..",
        "theme",
        "tokens",
        "design-tokens.ts"
      );
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it("ThemeSystem.tsx at shared/components does NOT exist", () => {
      const filePath = path.resolve(
        __dirname,
        "..",
        "..",
        "..",
        "shared",
        "components",
        "theme",
        "ThemeSystem.tsx"
      );
      expect(fs.existsSync(filePath)).toBe(false);
    });
  });
});
