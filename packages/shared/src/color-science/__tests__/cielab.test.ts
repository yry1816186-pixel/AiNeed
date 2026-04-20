import {
  rgb_to_lab,
  lab_to_rgb,
  delta_e_ciede2000,
  hex_to_lab,
  lab_to_hex,
  compute_ita,
  compute_chroma,
  is_skin_pixel_cielab,
} from "../cielab";

import {
  classify_tone,
  classify_depth,
  classify_chroma,
  determine_season,
  TwelveSeason,
  ToneType,
  DepthType,
  ChromaType,
  SEASON_PALETTES,
} from "../season-classifier";

describe("CIELAB", () => {
  describe("rgb_to_lab", () => {
    test("pure red", () => {
      const lab = rgb_to_lab(255, 0, 0);
      expect(lab.L).toBeCloseTo(53.23, 1);
      expect(lab.a).toBeCloseTo(80.11, 0);
      expect(lab.b).toBeCloseTo(67.22, 0);
    });

    test("pure green", () => {
      const lab = rgb_to_lab(0, 255, 0);
      expect(lab.L).toBeCloseTo(87.74, 1);
      expect(lab.a).toBeCloseTo(-86.18, 0);
      expect(lab.b).toBeCloseTo(83.18, 0);
    });

    test("pure blue", () => {
      const lab = rgb_to_lab(0, 0, 255);
      expect(lab.L).toBeCloseTo(32.3, 1);
      expect(lab.a).toBeCloseTo(79.2, 0);
      expect(lab.b).toBeCloseTo(-107.86, 0);
    });

    test("white", () => {
      const lab = rgb_to_lab(255, 255, 255);
      expect(lab.L).toBeCloseTo(100, 0);
      expect(lab.a).toBeCloseTo(0, 0);
      expect(lab.b).toBeCloseTo(0, 0);
    });

    test("black", () => {
      const lab = rgb_to_lab(0, 0, 0);
      expect(lab.L).toBeCloseTo(0, 0);
    });

    test("mid gray", () => {
      const lab = rgb_to_lab(128, 128, 128);
      expect(lab.L).toBeCloseTo(53.59, 1);
      expect(lab.a).toBeCloseTo(0, 0);
      expect(lab.b).toBeCloseTo(0, 0);
    });
  });

  describe("lab_to_rgb", () => {
    test("roundtrip: pure red", () => {
      const lab = rgb_to_lab(255, 0, 0);
      const rgb = lab_to_rgb(lab.L, lab.a, lab.b);
      expect(rgb.r).toBe(255);
      expect(rgb.g).toBe(0);
      expect(rgb.b).toBe(0);
    });

    test("roundtrip: white", () => {
      const lab = rgb_to_lab(255, 255, 255);
      const rgb = lab_to_rgb(lab.L, lab.a, lab.b);
      expect(rgb.r).toBe(255);
      expect(rgb.g).toBe(255);
      expect(rgb.b).toBe(255);
    });

    test("roundtrip: black", () => {
      const lab = rgb_to_lab(0, 0, 0);
      const rgb = lab_to_rgb(lab.L, lab.a, lab.b);
      expect(rgb.r).toBe(0);
      expect(rgb.g).toBe(0);
      expect(rgb.b).toBe(0);
    });

    test("roundtrip: mid gray", () => {
      const lab = rgb_to_lab(128, 128, 128);
      const rgb = lab_to_rgb(lab.L, lab.a, lab.b);
      expect(rgb.r).toBe(128);
      expect(rgb.g).toBe(128);
      expect(rgb.b).toBe(128);
    });
  });

  describe("delta_e_ciede2000", () => {
    test("identical colors", () => {
      const lab = { L: 50, a: 30, b: -20 };
      expect(delta_e_ciede2000(lab, lab)).toBeCloseTo(0, 5);
    });

    test("CIEDE2000 test pair 1", () => {
      const lab1 = { L: 50.0, a: 2.6772, b: -79.7751 };
      const lab2 = { L: 50.0, a: 0.0, b: -82.7485 };
      expect(delta_e_ciede2000(lab1, lab2)).toBeCloseTo(2.0425, 2);
    });

    test("CIEDE2000 test pair 2 (near-achromatic)", () => {
      const lab1 = { L: 50.0, a: 0.0, b: 0.0 };
      const lab2 = { L: 50.0, a: -1.0, b: 2.0 };
      const de = delta_e_ciede2000(lab1, lab2);
      expect(de).toBeGreaterThan(0);
      expect(de).toBeLessThan(5);
    });

    test("large color difference", () => {
      const lab1 = { L: 50.0, a: 2.6772, b: -79.7751 };
      const lab2 = { L: 73.0, a: 25.0, b: -18.0 };
      const de = delta_e_ciede2000(lab1, lab2);
      expect(de).toBeGreaterThan(20);
    });
  });

  describe("hex_to_lab / lab_to_hex", () => {
    test("hex_to_lab: red", () => {
      const lab = hex_to_lab("#FF0000");
      expect(lab.L).toBeCloseTo(53.23, 1);
      expect(lab.a).toBeCloseTo(80.11, 0);
    });

    test("roundtrip: #FF6B6B", () => {
      const hex = "#FF6B6B";
      const lab = hex_to_lab(hex);
      const roundtrip = lab_to_hex(lab);
      const original = hex_to_lab(hex);
      const roundtripLab = hex_to_lab(roundtrip);
      expect(Math.abs(original.L - roundtripLab.L)).toBeLessThan(1);
      expect(Math.abs(original.a - roundtripLab.a)).toBeLessThan(1);
      expect(Math.abs(original.b - roundtripLab.b)).toBeLessThan(1);
    });

    test("roundtrip: #000000", () => {
      const hex = "#000000";
      const lab = hex_to_lab(hex);
      const roundtrip = lab_to_hex(lab);
      expect(roundtrip).toBe("#000000");
    });

    test("roundtrip: #FFFFFF", () => {
      const hex = "#FFFFFF";
      const lab = hex_to_lab(hex);
      const roundtrip = lab_to_hex(lab);
      expect(roundtrip).toBe("#FFFFFF");
    });
  });

  describe("compute_ita", () => {
    test("typical skin ITA", () => {
      const ita = compute_ita(65.0, 15.0);
      expect(ita).toBeCloseTo(45.0, 0);
    });

    test("zero b* (edge case)", () => {
      const ita = compute_ita(60.0, 0.0);
      expect(ita).toBe(90.0);
    });
  });

  describe("compute_chroma", () => {
    test("zero chroma", () => {
      expect(compute_chroma(0, 0)).toBe(0);
    });

    test("positive chroma", () => {
      const c = compute_chroma(10, 10);
      expect(c).toBeCloseTo(14.14, 1);
    });
  });

  describe("is_skin_pixel_cielab", () => {
    test("typical skin pixel", () => {
      expect(is_skin_pixel_cielab(220, 180, 150)).toBe(true);
    });

    test("pure red is not skin", () => {
      expect(is_skin_pixel_cielab(255, 0, 0)).toBe(false);
    });

    test("pure green is not skin", () => {
      expect(is_skin_pixel_cielab(0, 255, 0)).toBe(false);
    });
  });
});

describe("Season Classifier", () => {
  describe("classify_tone", () => {
    test("warm tone", () => {
      const result = classify_tone(12.0);
      expect(result.tone).toBe(ToneType.WARM);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test("cool tone", () => {
      const result = classify_tone(-5.0);
      expect(result.tone).toBe(ToneType.COOL);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    test("neutral tone", () => {
      const result = classify_tone(0.0);
      expect(result.tone).toBe(ToneType.NEUTRAL);
    });

    test("ITA-adaptive threshold", () => {
      const lightSkin = classify_tone(7.0, 60.0);
      const darkSkin = classify_tone(2.0, 5.0);
      expect(lightSkin.tone).toBe(ToneType.WARM);
      expect(darkSkin.tone).toBe(ToneType.NEUTRAL);
    });
  });

  describe("classify_depth", () => {
    test("light depth", () => {
      const result = classify_depth(70.0);
      expect(result.depth).toBe(DepthType.LIGHT);
    });

    test("deep depth", () => {
      const result = classify_depth(35.0);
      expect(result.depth).toBe(DepthType.DEEP);
    });
  });

  describe("classify_chroma", () => {
    test("clear chroma", () => {
      const result = classify_chroma(20.0);
      expect(result.chromaType).toBe(ChromaType.CLEAR);
    });

    test("muted chroma", () => {
      const result = classify_chroma(5.0);
      expect(result.chromaType).toBe(ChromaType.MUTED);
    });
  });

  describe("determine_season", () => {
    test("warm + light + clear = spring warm light clear", () => {
      expect(determine_season(ToneType.WARM, DepthType.LIGHT, ChromaType.CLEAR)).toBe(
        TwelveSeason.SPRING_WARM_LIGHT_CLEAR
      );
    });

    test("cool + deep + clear = winter cool deep clear", () => {
      expect(determine_season(ToneType.COOL, DepthType.DEEP, ChromaType.CLEAR)).toBe(
        TwelveSeason.WINTER_COOL_DEEP_CLEAR
      );
    });

    test("neutral + light + muted = spring warm light muted", () => {
      expect(determine_season(ToneType.NEUTRAL, DepthType.LIGHT, ChromaType.MUTED)).toBe(
        TwelveSeason.SPRING_WARM_LIGHT_MUTED
      );
    });

    test("cool + light + muted = summer cool light muted", () => {
      expect(determine_season(ToneType.COOL, DepthType.LIGHT, ChromaType.MUTED)).toBe(
        TwelveSeason.SUMMER_COOL_LIGHT_MUTED
      );
    });
  });

  describe("SEASON_PALETTES", () => {
    test("all 12 seasons have palettes", () => {
      const allSeasons = Object.values(TwelveSeason);
      expect(allSeasons.length).toBe(12);
      for (const season of allSeasons) {
        const palette = SEASON_PALETTES[season];
        expect(palette).toBeDefined();
        expect(palette.suitable.length).toBeGreaterThan(0);
        expect(palette.unsuitable.length).toBeGreaterThan(0);
      }
    });

    test("each swatch has name, hex, reason", () => {
      for (const season of Object.values(TwelveSeason)) {
        const palette = SEASON_PALETTES[season];
        for (const swatch of [...palette.suitable, ...palette.unsuitable]) {
          expect(swatch.name).toBeTruthy();
          expect(swatch.hex).toMatch(/^#[0-9A-F]{6}$/);
          expect(swatch.reason).toBeTruthy();
        }
      }
    });
  });
});
