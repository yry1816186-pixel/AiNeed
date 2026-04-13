import { ColorDerivationEngine, ColorPreferenceResult } from "./color-derivation.service";

describe("ColorDerivationEngine", () => {
  let engine: ColorDerivationEngine;

  beforeEach(() => {
    engine = new ColorDerivationEngine();
  });

  it("should be defined", () => {
    expect(engine).toBeDefined();
  });

  describe("deriveColorPreferences", () => {
    it("should return top 8 colors sorted by weight descending", () => {
      const options = [
        {
          colorTags: [
            { hex: "#FF0000", category: "warm", weight: 3 },
            { hex: "#0000FF", category: "cool", weight: 1 },
            { hex: "#00FF00", category: "neutral", weight: 2 },
          ],
        },
      ];

      const result = engine.deriveColorPreferences(options);

      expect(result.colorPalette).toHaveLength(3);
      expect(result.colorPalette[0]!.hex).toBe("#FF0000");
      expect(result.colorPalette[0]!.weight).toBe(3);
      expect(result.colorPalette[1]!.hex).toBe("#00FF00");
      expect(result.colorPalette[1]!.weight).toBe(2);
      expect(result.colorPalette[2]!.hex).toBe("#0000FF");
      expect(result.colorPalette[2]!.weight).toBe(1);
    });

    it("should aggregate weights for same hex code across options", () => {
      const options = [
        {
          colorTags: [
            { hex: "#2D2D2D", category: "neutral", weight: 2 },
          ],
        },
        {
          colorTags: [
            { hex: "#2D2D2D", category: "dark", weight: 3 },
          ],
        },
      ];

      const result = engine.deriveColorPreferences(options);

      expect(result.colorPalette).toHaveLength(1);
      expect(result.colorPalette[0]!.weight).toBe(5);
    });

    it("should keep highest-weight category for aggregated colors", () => {
      const options = [
        {
          colorTags: [
            { hex: "#FF0000", category: "warm", weight: 1 },
          ],
        },
        {
          colorTags: [
            { hex: "#FF0000", category: "accent", weight: 5 },
          ],
        },
      ];

      const result = engine.deriveColorPreferences(options);

      expect(result.colorPalette[0]!.category).toBe("accent");
    });

    it("should limit to top 8 colors", () => {
      const options = [
        {
          colorTags: Array.from({ length: 15 }, (_, i) => ({
            hex: `#${String(i).padStart(2, "0")}0000`,
            category: "test",
            weight: 15 - i,
          })),
        },
      ];

      const result = engine.deriveColorPreferences(options);

      expect(result.colorPalette.length).toBeLessThanOrEqual(8);
    });

    it("should return Chinese color names for known hex codes", () => {
      const options = [
        {
          colorTags: [
            { hex: "#2D2D2D", category: "neutral", weight: 1 },
          ],
        },
      ];

      const result = engine.deriveColorPreferences(options);

      expect(result.colorPalette[0]!.name).toBe("炭灰");
    });

    it("should return fallback name for unknown hex codes", () => {
      const options = [
        {
          colorTags: [
            { hex: "#AB1234", category: "unknown", weight: 1 },
          ],
        },
      ];

      const result = engine.deriveColorPreferences(options);

      expect(result.colorPalette[0]!.name).toBeTruthy();
    });

    it("should be deterministic: same input always produces same output", () => {
      const options = [
        {
          colorTags: [
            { hex: "#F5F5DC", category: "neutral", weight: 2 },
            { hex: "#8B4513", category: "warm", weight: 3 },
            { hex: "#FF0000", category: "accent", weight: 1 },
          ],
        },
      ];

      const result1 = engine.deriveColorPreferences(options);
      const result2 = engine.deriveColorPreferences(options);

      expect(result1).toEqual(result2);
    });

    it("should return empty palette for empty input", () => {
      const result = engine.deriveColorPreferences([]);

      expect(result.colorPalette).toHaveLength(0);
    });

    it("should handle options with empty colorTags", () => {
      const options = [
        { colorTags: [] },
        { colorTags: [{ hex: "#FF0000", category: "warm", weight: 1 }] },
      ];

      const result = engine.deriveColorPreferences(options);

      expect(result.colorPalette).toHaveLength(1);
    });
  });
});
