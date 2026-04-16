/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from "@nestjs/common";

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface LAB {
  L: number;
  a: number;
  b: number;
}

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface ColorMatchResult {
  color: string;
  hex: string;
  rgb: RGB;
  lab: LAB;
  distance: number;
  compatibility: "excellent" | "good" | "acceptable" | "poor";
}

@Injectable()
export class ColorMatchingService {
  private readonly logger = new Logger(ColorMatchingService.name);

  private readonly colorDatabase: Map<
    string,
    { rgb: RGB; lab: LAB; name: string; category: string }
  > = new Map();

  private readonly colorHarmonyRules = {
    complementary: (h1: number) => [(h1 + 180) % 360],
    analogous: (h1: number) => [(h1 + 30) % 360, (h1 - 30 + 360) % 360],
    triadic: (h1: number) => [(h1 + 120) % 360, (h1 + 240) % 360],
    splitComplementary: (h1: number) => [(h1 + 150) % 360, (h1 + 210) % 360],
    tetradic: (h1: number) => [
      (h1 + 90) % 360,
      (h1 + 180) % 360,
      (h1 + 270) % 360,
    ],
  };

  constructor() {
    this.initializeColorDatabase();
  }

  private initializeColorDatabase(): void {
    const colors = [
      { name: "black", rgb: { r: 0, g: 0, b: 0 }, category: "neutral" },
      { name: "white", rgb: { r: 255, g: 255, b: 255 }, category: "neutral" },
      { name: "gray", rgb: { r: 128, g: 128, b: 128 }, category: "neutral" },
      { name: "navy", rgb: { r: 0, g: 0, b: 128 }, category: "blue" },
      { name: "blue", rgb: { r: 0, g: 0, b: 255 }, category: "blue" },
      { name: "sky-blue", rgb: { r: 135, g: 206, b: 235 }, category: "blue" },
      { name: "red", rgb: { r: 255, g: 0, b: 0 }, category: "red" },
      { name: "crimson", rgb: { r: 220, g: 20, b: 60 }, category: "red" },
      { name: "burgundy", rgb: { r: 128, g: 0, b: 32 }, category: "red" },
      { name: "pink", rgb: { r: 255, g: 192, b: 203 }, category: "pink" },
      { name: "coral", rgb: { r: 255, g: 127, b: 80 }, category: "orange" },
      { name: "orange", rgb: { r: 255, g: 165, b: 0 }, category: "orange" },
      { name: "peach", rgb: { r: 255, g: 218, b: 185 }, category: "orange" },
      { name: "yellow", rgb: { r: 255, g: 255, b: 0 }, category: "yellow" },
      { name: "gold", rgb: { r: 255, g: 215, b: 0 }, category: "yellow" },
      { name: "beige", rgb: { r: 245, g: 245, b: 220 }, category: "neutral" },
      { name: "cream", rgb: { r: 255, g: 253, b: 208 }, category: "neutral" },
      { name: "brown", rgb: { r: 139, g: 69, b: 19 }, category: "brown" },
      { name: "tan", rgb: { r: 210, g: 180, b: 140 }, category: "brown" },
      { name: "camel", rgb: { r: 193, g: 154, b: 107 }, category: "brown" },
      { name: "green", rgb: { r: 0, g: 128, b: 0 }, category: "green" },
      { name: "olive", rgb: { r: 128, g: 128, b: 0 }, category: "green" },
      { name: "mint", rgb: { r: 189, g: 252, b: 201 }, category: "green" },
      { name: "purple", rgb: { r: 128, g: 0, b: 128 }, category: "purple" },
      { name: "lavender", rgb: { r: 230, g: 230, b: 250 }, category: "purple" },
      { name: "violet", rgb: { r: 238, g: 130, b: 238 }, category: "purple" },
    ];

    for (const color of colors) {
      const lab = this.rgbToLab(color.rgb);
      this.colorDatabase.set(color.name, {
        rgb: color.rgb,
        lab,
        name: color.name,
        category: color.category,
      });
    }
  }

  rgbToLab(rgb: RGB): LAB {
    let r = rgb.r / 255;
    let g = rgb.g / 255;
    let b = rgb.b / 255;

    r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    let x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
    let y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.0;
    let z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;

    x = x > 0.008856 ? Math.pow(x, 1 / 3) : 7.787 * x + 16 / 116;
    y = y > 0.008856 ? Math.pow(y, 1 / 3) : 7.787 * y + 16 / 116;
    z = z > 0.008856 ? Math.pow(z, 1 / 3) : 7.787 * z + 16 / 116;

    return {
      L: 116 * y - 16,
      a: 500 * (x - y),
      b: 200 * (y - z),
    };
  }

  labToRgb(lab: LAB): RGB {
    let y = (lab.L + 16) / 116;
    let x = lab.a / 500 + y;
    let z = y - lab.b / 200;

    const y3 = Math.pow(y, 3);
    const x3 = Math.pow(x, 3);
    const z3 = Math.pow(z, 3);

    y = y3 > 0.008856 ? y3 : (y - 16 / 116) / 7.787;
    x = x3 > 0.008856 ? x3 : (x - 16 / 116) / 7.787;
    z = z3 > 0.008856 ? z3 : (z - 16 / 116) / 7.787;

    x *= 0.95047;
    y *= 1.0;
    z *= 1.08883;

    let r = x * 3.2406 + y * -1.5372 + z * -0.4986;
    let g = x * -0.9689 + y * 1.8758 + z * 0.0415;
    let b = x * 0.0557 + y * -0.204 + z * 1.057;

    r = r > 0.0031308 ? 1.055 * Math.pow(r, 1 / 2.4) - 0.055 : 12.92 * r;
    g = g > 0.0031308 ? 1.055 * Math.pow(g, 1 / 2.4) - 0.055 : 12.92 * g;
    b = b > 0.0031308 ? 1.055 * Math.pow(b, 1 / 2.4) - 0.055 : 12.92 * b;

    return {
      r: Math.round(Math.max(0, Math.min(255, r * 255))),
      g: Math.round(Math.max(0, Math.min(255, g * 255))),
      b: Math.round(Math.max(0, Math.min(255, b * 255))),
    };
  }

  rgbToHsl(rgb: RGB): HSL {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100),
    };
  }

  hexToRgb(hex: string): RGB {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) {
      throw new Error("Invalid hex color");
    }

    const [, red = "00", green = "00", blue = "00"] = result;

    return {
      r: parseInt(red, 16),
      g: parseInt(green, 16),
      b: parseInt(blue, 16),
    };
  }

  rgbToHex(rgb: RGB): string {
    const toHex = (n: number) => {
      const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };

    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
  }

  deltaE(lab1: LAB, lab2: LAB): number {
    const deltaL = lab1.L - lab2.L;
    const deltaA = lab1.a - lab2.a;
    const deltaB = lab1.b - lab2.b;

    return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
  }

  deltaE2000(lab1: LAB, lab2: LAB): number {
    const L1 = lab1.L;
    const a1 = lab1.a;
    const b1 = lab1.b;
    const L2 = lab2.L;
    const a2 = lab2.a;
    const b2 = lab2.b;

    const kL = 1;
    const kC = 1;
    const kH = 1;

    const C1 = Math.sqrt(a1 * a1 + b1 * b1);
    const C2 = Math.sqrt(a2 * a2 + b2 * b2);
    const Cmean = (C1 + C2) / 2;

    const G =
      0.5 *
      (1 -
        Math.sqrt(Math.pow(Cmean, 7) / (Math.pow(Cmean, 7) + Math.pow(25, 7))));

    const a1Prime = a1 * (1 + G);
    const a2Prime = a2 * (1 + G);

    const C1Prime = Math.sqrt(a1Prime * a1Prime + b1 * b1);
    const C2Prime = Math.sqrt(a2Prime * a2Prime + b2 * b2);

    let h1Prime = Math.atan2(b1, a1Prime) * (180 / Math.PI);
    if (h1Prime < 0) {h1Prime += 360;}

    let h2Prime = Math.atan2(b2, a2Prime) * (180 / Math.PI);
    if (h2Prime < 0) {h2Prime += 360;}

    const deltaLPrime = L2 - L1;
    const deltaCPrime = C2Prime - C1Prime;

    let deltahPrime: number;
    if (C1Prime * C2Prime === 0) {
      deltahPrime = 0;
    } else if (Math.abs(h2Prime - h1Prime) <= 180) {
      deltahPrime = h2Prime - h1Prime;
    } else if (h2Prime - h1Prime > 180) {
      deltahPrime = h2Prime - h1Prime - 360;
    } else {
      deltahPrime = h2Prime - h1Prime + 360;
    }

    const deltaHPrime =
      2 *
      Math.sqrt(C1Prime * C2Prime) *
      Math.sin((deltahPrime * Math.PI) / 360);

    const LPrimeMean = (L1 + L2) / 2;
    const CPrimeMean = (C1Prime + C2Prime) / 2;

    let HPrimeMean: number;
    if (C1Prime * C2Prime === 0) {
      HPrimeMean = h1Prime + h2Prime;
    } else if (Math.abs(h1Prime - h2Prime) <= 180) {
      HPrimeMean = (h1Prime + h2Prime) / 2;
    } else if (h1Prime + h2Prime < 360) {
      HPrimeMean = (h1Prime + h2Prime + 360) / 2;
    } else {
      HPrimeMean = (h1Prime + h2Prime - 360) / 2;
    }

    const T =
      1 -
      0.17 * Math.cos(((HPrimeMean - 30) * Math.PI) / 180) +
      0.24 * Math.cos((2 * HPrimeMean * Math.PI) / 180) +
      0.32 * Math.cos(((3 * HPrimeMean + 6) * Math.PI) / 180) -
      0.2 * Math.cos(((4 * HPrimeMean - 63) * Math.PI) / 180);

    const SL =
      1 +
      (0.015 * Math.pow(LPrimeMean - 50, 2)) /
        Math.sqrt(20 + Math.pow(LPrimeMean - 50, 2));
    const SC = 1 + 0.045 * CPrimeMean;
    const SH = 1 + 0.015 * CPrimeMean * T;

    const deltaTheta = 30 * Math.exp(-Math.pow((HPrimeMean - 275) / 25, 2));

    const RC =
      2 *
      Math.sqrt(
        Math.pow(CPrimeMean, 7) / (Math.pow(CPrimeMean, 7) + Math.pow(25, 7)),
      );

    const RT = -RC * Math.sin((2 * deltaTheta * Math.PI) / 180);

    const deltaE = Math.sqrt(
      Math.pow(deltaLPrime / (kL * SL), 2) +
        Math.pow(deltaCPrime / (kC * SC), 2) +
        Math.pow(deltaHPrime / (kH * SH), 2) +
        RT * (deltaCPrime / (kC * SC)) * (deltaHPrime / (kH * SH)),
    );

    return deltaE;
  }

  findClosestColor(rgb: RGB): ColorMatchResult {
    const inputLab = this.rgbToLab(rgb);
    let closestMatch: ColorMatchResult | null = null;
    let minDistance = Infinity;

    for (const [name, data] of this.colorDatabase) {
      const distance = this.deltaE2000(inputLab, data.lab);

      if (distance < minDistance) {
        minDistance = distance;
        closestMatch = {
          color: name,
          hex: this.rgbToHex(data.rgb),
          rgb: data.rgb,
          lab: data.lab,
          distance,
          compatibility: this.getCompatibility(distance),
        };
      }
    }

    return closestMatch!;
  }

  private getCompatibility(
    distance: number,
  ): "excellent" | "good" | "acceptable" | "poor" {
    if (distance < 2) {return "excellent";}
    if (distance < 5) {return "good";}
    if (distance < 10) {return "acceptable";}
    return "poor";
  }

  getHarmoniousColors(colorName: string): Map<string, string[]> {
    const colorData = this.colorDatabase.get(colorName);
    if (!colorData) {
      return new Map();
    }

    const hsl = this.rgbToHsl(colorData.rgb);
    const harmonies = new Map<string, string[]>();

    for (const [harmonyType, calculator] of Object.entries(
      this.colorHarmonyRules,
    )) {
      const hueAngles = calculator(hsl.h);
      const harmonyColors: string[] = [];

      for (const hue of hueAngles) {
        const closest = this.findClosestColorByHue(hue);
        if (closest) {
          harmonyColors.push(closest);
        }
      }

      harmonies.set(harmonyType, harmonyColors);
    }

    return harmonies;
  }

  private findClosestColorByHue(targetHue: number): string | null {
    let closestName: string | null = null;
    let minHueDiff = Infinity;

    for (const [name, data] of this.colorDatabase) {
      const hsl = this.rgbToHsl(data.rgb);
      let hueDiff = Math.abs(hsl.h - targetHue);
      if (hueDiff > 180) {hueDiff = 360 - hueDiff;}

      if (hueDiff < minHueDiff) {
        minHueDiff = hueDiff;
        closestName = name;
      }
    }

    return closestName;
  }

  checkColorCompatibility(color1: string, color2: string): number {
    const c1 = this.colorDatabase.get(color1);
    const c2 = this.colorDatabase.get(color2);

    if (!c1 || !c2) {
      return 0;
    }

    const distance = this.deltaE2000(c1.lab, c2.lab);

    const hsl1 = this.rgbToHsl(c1.rgb);
    const hsl2 = this.rgbToHsl(c2.rgb);

    let hueDiff = Math.abs(hsl1.h - hsl2.h);
    if (hueDiff > 180) {hueDiff = 360 - hueDiff;}

    const isNeutral = (hsl: HSL) => hsl.s < 20;
    const neutral1 = isNeutral(hsl1);
    const neutral2 = isNeutral(hsl2);

    if (neutral1 || neutral2) {
      return 90;
    }

    if (hueDiff < 30 || hueDiff > 150) {
      return 85;
    }

    if (hueDiff >= 30 && hueDiff <= 60) {
      return 75;
    }

    return Math.max(50, 100 - distance * 2);
  }

  getColorSeasonSuitability(colorName: string): Map<string, number> {
    const colorData = this.colorDatabase.get(colorName);
    if (!colorData) {
      return new Map();
    }

    const hsl = this.rgbToHsl(colorData.rgb);
    const suitability = new Map<string, number>();

    const isWarm = hsl.h >= 0 && hsl.h < 90;
    const isCool = hsl.h >= 180 && hsl.h < 270;
    const isNeutral = hsl.s < 20;
    const isBright = hsl.s > 70 && hsl.l > 50;
    const isMuted = hsl.s < 50;
    const isLight = hsl.l > 70;
    const isDark = hsl.l < 30;

    if (isNeutral) {
      suitability.set("spring", 70);
      suitability.set("summer", 70);
      suitability.set("autumn", 70);
      suitability.set("winter", 70);
    } else if (isWarm && isBright) {
      suitability.set("spring", 90);
      suitability.set("autumn", 60);
      suitability.set("summer", 40);
      suitability.set("winter", 30);
    } else if (isWarm && isMuted) {
      suitability.set("autumn", 90);
      suitability.set("spring", 60);
      suitability.set("summer", 40);
      suitability.set("winter", 30);
    } else if (isCool && isBright) {
      suitability.set("winter", 90);
      suitability.set("summer", 70);
      suitability.set("spring", 40);
      suitability.set("autumn", 30);
    } else if (isCool && isMuted) {
      suitability.set("summer", 90);
      suitability.set("winter", 60);
      suitability.set("spring", 40);
      suitability.set("autumn", 30);
    } else {
      suitability.set("spring", 60);
      suitability.set("summer", 60);
      suitability.set("autumn", 60);
      suitability.set("winter", 60);
    }

    return suitability;
  }

  suggestOutfitColors(
    baseColor: string,
    options: { count?: number; includeNeutrals?: boolean } = {},
  ): ColorMatchResult[] {
    const { count = 3, includeNeutrals = true } = options;

    const harmonious = this.getHarmoniousColors(baseColor);
    const suggestions: ColorMatchResult[] = [];

    const baseData = this.colorDatabase.get(baseColor);
    if (!baseData) {return suggestions;}

    suggestions.push({
      color: baseColor,
      hex: this.rgbToHex(baseData.rgb),
      rgb: baseData.rgb,
      lab: baseData.lab,
      distance: 0,
      compatibility: "excellent",
    });

    const analogous = harmonious.get("analogous") || [];
    for (const color of analogous.slice(0, 1)) {
      const data = this.colorDatabase.get(color);
      if (data) {
        suggestions.push({
          color,
          hex: this.rgbToHex(data.rgb),
          rgb: data.rgb,
          lab: data.lab,
          distance: this.deltaE2000(baseData.lab, data.lab),
          compatibility: "good",
        });
      }
    }

    if (includeNeutrals) {
      const neutrals = ["black", "white", "gray", "navy", "beige"];
      for (const neutral of neutrals) {
        if (neutral !== baseColor) {
          const data = this.colorDatabase.get(neutral);
          if (data) {
            suggestions.push({
              color: neutral,
              hex: this.rgbToHex(data.rgb),
              rgb: data.rgb,
              lab: data.lab,
              distance: this.deltaE2000(baseData.lab, data.lab),
              compatibility: "excellent",
            });
          }
        }
        if (suggestions.length >= count + 1) {break;}
      }
    }

    return suggestions.slice(0, count + 1);
  }
}
