/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable } from "@nestjs/common";

import { HSLColor, SelectedImageWithMeta } from "./question-selector";

export interface ColorWeight {
  hueSegment: string;
  weight: number;
  medianHSL: HSLColor;
}

export interface ColorPreferenceResult {
  primaryColors: ColorWeight[];
  secondaryColors: ColorWeight[];
  colorSeason: string;
  palette: string[];
  hueDistribution: Record<string, number>;
}

const HUE_SEGMENTS: { name: string; ranges: [number, number][] }[] = [
  { name: "red", ranges: [[0, 30], [330, 360]] },
  { name: "orange", ranges: [[30, 60]] },
  { name: "yellow", ranges: [[60, 90]] },
  { name: "yellow-green", ranges: [[90, 150]] },
  { name: "green", ranges: [[150, 210]] },
  { name: "cyan-blue", ranges: [[210, 270]] },
  { name: "blue", ranges: [[270, 300]] },
  { name: "purple", ranges: [[300, 330]] },
];

@Injectable()
export class ColorDeriverService {
  deriveColorPreferences(
    selectedImages: SelectedImageWithMeta[],
  ): ColorPreferenceResult {
    const segmentData: Record<
      string,
      { colors: HSLColor[]; totalWeight: number }
    > = {};

    for (const segment of HUE_SEGMENTS) {
      segmentData[segment.name] = { colors: [], totalWeight: 0 };
    }

    for (const image of selectedImages) {
      const durationWeight =
        image.duration > 0 ? Math.min(1.0, 3000 / image.duration) : 1.0;

      for (const color of image.imageMeta.dominantColors) {
        const segmentName = this.getHueSegment(color.h);
        if (segmentName && segmentData[segmentName]) {
          segmentData[segmentName].colors.push(color);
          segmentData[segmentName].totalWeight +=
            (1 + (0.5 * color.s) / 100) * durationWeight;
        }
      }
    }

    const hueDistribution: Record<string, number> = {};
    const colorWeights: ColorWeight[] = [];

    for (const segment of HUE_SEGMENTS) {
      const data = segmentData[segment.name];
      if (!data) {continue;}
      hueDistribution[segment.name] = data.totalWeight;

      if (data.colors.length > 0) {
        const medianHSL = this.getMedianHSL(data.colors);
        colorWeights.push({
          hueSegment: segment.name,
          weight: data.totalWeight,
          medianHSL,
        });
      }
    }

    colorWeights.sort((a, b) => b.weight - a.weight);

    const primaryColors = colorWeights.slice(0, 3);
    const secondaryColors = colorWeights.slice(3, 5);

    const colorSeason = this.deriveColorSeason(segmentData);

    const palette = [...primaryColors, ...secondaryColors]
      .filter((cw) => cw.medianHSL.s > 0 || cw.medianHSL.l > 0)
      .map((cw) =>
        this.hslToHex(cw.medianHSL.h, cw.medianHSL.s, cw.medianHSL.l),
      );

    return {
      primaryColors,
      secondaryColors,
      colorSeason,
      palette,
      hueDistribution,
    };
  }

  hslToHex(h: number, s: number, l: number): string {
    const sNorm = s / 100;
    const lNorm = l / 100;

    const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = lNorm - c / 2;

    let r = 0;
    let g = 0;
    let b = 0;

    if (h >= 0 && h < 60) {
      r = c;
      g = x;
      b = 0;
    } else if (h >= 60 && h < 120) {
      r = x;
      g = c;
      b = 0;
    } else if (h >= 120 && h < 180) {
      r = 0;
      g = c;
      b = x;
    } else if (h >= 180 && h < 240) {
      r = 0;
      g = x;
      b = c;
    } else if (h >= 240 && h < 300) {
      r = x;
      g = 0;
      b = c;
    } else if (h >= 300 && h < 360) {
      r = c;
      g = 0;
      b = x;
    }

    const toHex = (n: number) => {
      const hex = Math.round(
        Math.max(0, Math.min(255, (n + m) * 255)),
      ).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  private getHueSegment(h: number): string | null {
    for (const segment of HUE_SEGMENTS) {
      for (const [min, max] of segment.ranges) {
        if (h >= min && h < max) {
          return segment.name;
        }
      }
    }
    return null;
  }

  private getMedianHSL(colors: HSLColor[]): HSLColor {
    const sorted = [...colors].sort((a, b) => a.h - b.h);
    const mid = Math.floor(sorted.length / 2);
    const medianH =
      sorted.length % 2 !== 0
        ? sorted[mid]!.h
        : (sorted[mid - 1]!.h + sorted[mid]!.h) / 2;

    const avgS = colors.reduce((sum, c) => sum + c.s, 0) / colors.length;
    const avgL = colors.reduce((sum, c) => sum + c.l, 0) / colors.length;

    return {
      h: Math.round(medianH),
      s: Math.round(avgS),
      l: Math.round(avgL),
    };
  }

  private deriveColorSeason(
    segmentData: Record<
      string,
      { colors: HSLColor[]; totalWeight: number }
    >,
  ): string {
    const warmSegments = ["red", "orange", "yellow"];
    const coolSegments = ["cyan-blue", "blue", "purple"];

    let warmWeight = 0;
    let coolWeight = 0;
    let warmSaturation = 0;
    let warmCount = 0;
    let coolSaturation = 0;
    let coolCount = 0;

    for (const seg of warmSegments) {
      const segData = segmentData[seg];
      if (!segData) {continue;}
      warmWeight += segData.totalWeight;
      warmSaturation += segData.colors.reduce(
        (s, c) => s + c.s,
        0,
      );
      warmCount += segData.colors.length;
    }

    for (const seg of coolSegments) {
      const segData = segmentData[seg];
      if (!segData) {continue;}
      coolWeight += segData.totalWeight;
      coolSaturation += segData.colors.reduce(
        (s, c) => s + c.s,
        0,
      );
      coolCount += segData.colors.length;
    }

    const isWarm = warmWeight >= coolWeight;
    const avgWarmSat = warmCount > 0 ? warmSaturation / warmCount : 50;
    const avgCoolSat = coolCount > 0 ? coolSaturation / coolCount : 50;
    const avgSaturation = isWarm ? avgWarmSat : avgCoolSat;
    const isHighSaturation = avgSaturation >= 50;

    if (isWarm && isHighSaturation) {return "spring";}
    if (!isWarm && !isHighSaturation) {return "summer";}
    if (isWarm && !isHighSaturation) {return "autumn";}
    return "winter";
  }
}
