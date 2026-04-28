import { lightColors, darkColors } from "../color-resolver";

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return null;
  return [
    parseInt(clean.substring(0, 2), 16),
    parseInt(clean.substring(2, 4), 16),
    parseInt(clean.substring(4, 6), 16),
  ];
}

function relativeLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(hex1, hex2) {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  if (!rgb1 || !rgb2) return null;
  const l1 = relativeLuminance(...rgb1);
  const l2 = relativeLuminance(...rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("WCAG AA Contrast Validation", () => {
  const textKeys = ["primary", "secondary", "tertiary", "brand"];
  const surfaceKeys = ["primary", "secondary", "tertiary"];

  describe("Light mode", () => {
    surfaceKeys.forEach((bgKey) => {
      it(`all text colors pass 4.5:1 on surface.${bgKey}`, () => {
        const bg = lightColors.surface[bgKey];
        for (const tk of textKeys) {
          const fg = lightColors.text[tk];
          const ratio = contrastRatio(fg, bg);
          expect(ratio).not.toBeNull();
          expect(ratio).toBeGreaterThanOrEqual(4.5);
        }
      });
    });
  });

  describe("Dark mode", () => {
    surfaceKeys.forEach((bgKey) => {
      it(`all text colors pass 4.5:1 on surface.${bgKey}`, () => {
        const bg = darkColors.surface[bgKey];
        for (const tk of textKeys) {
          const fg = darkColors.text[tk];
          const ratio = contrastRatio(fg, bg);
          expect(ratio).not.toBeNull();
          expect(ratio).toBeGreaterThanOrEqual(4.5);
        }
      });
    });

    it("dark surface.primary is #1A1A18 (D-20)", () => {
      expect(darkColors.surface.primary).toBe("#1A1A18");
    });
  });
});
