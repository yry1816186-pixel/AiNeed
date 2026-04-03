import { Injectable, Logger } from "@nestjs/common";
import { BodyType, SkinTone, ColorSeason } from "@prisma/client";

interface ColorHarmony {
  type: string;
  colors: string[];
  score: number;
  description: string;
}

interface BodyTypeRecommendation {
  bodyType: BodyType;
  suitableStyles: string[];
  avoidStyles: string[];
  tips: string[];
}

interface ColorSeasonProfile {
  season: ColorSeason;
  bestColors: string[];
  avoidColors: string[];
  metalTone: "gold" | "silver" | "both";
  description: string;
}

@Injectable()
export class MatchingTheoryService {
  private readonly logger = new Logger(MatchingTheoryService.name);

  private readonly colorHarmonyRules = {
    complementary: {
      pairs: [
        ["red", "green"],
        ["blue", "orange"],
        ["yellow", "purple"],
        ["pink", "teal"],
      ],
      score: 0.85,
      description: "互补色搭配，形成强烈对比",
    },
    analogous: {
      groups: [
        ["red", "orange", "yellow"],
        ["blue", "teal", "green"],
        ["purple", "pink", "red"],
      ],
      score: 0.9,
      description: "类似色搭配，和谐统一",
    },
    triadic: {
      sets: [
        ["red", "yellow", "blue"],
        ["orange", "green", "purple"],
      ],
      score: 0.8,
      description: "三色搭配，活泼有层次",
    },
    monochromatic: {
      score: 0.75,
      description: "同色系搭配，简约优雅",
    },
  };

  private readonly bodyTypeRecommendations: Record<
    BodyType,
    BodyTypeRecommendation
  > = {
    [BodyType.rectangle]: {
      bodyType: BodyType.rectangle,
      suitableStyles: ["fitted", "structured", "layered", "peplum", "wrap"],
      avoidStyles: ["boxy", "oversized", "shapeless"],
      tips: [
        "选择有腰线的款式来创造曲线感",
        "尝试层叠穿搭增加层次感",
        "高腰裤/裙可以优化比例",
        "选择有纹理或图案的上衣增加视觉兴趣",
      ],
    },
    [BodyType.triangle]: {
      bodyType: BodyType.triangle,
      suitableStyles: ["a-line", "boat-neck", "off-shoulder", "wide-leg"],
      avoidStyles: ["skinny", "tight-bottom", "mini"],
      tips: [
        "上身选择亮色或有图案的款式",
        "A字裙非常适合您的体型",
        "避免紧身裤和紧身裙",
        "上身可以增加细节装饰",
      ],
    },
    [BodyType.inverted_triangle]: {
      bodyType: BodyType.inverted_triangle,
      suitableStyles: ["v-neck", "wide-leg", "a-line", "flared"],
      avoidStyles: ["shoulder-pads", "boat-neck", "tight-top"],
      tips: [
        "选择V领或圆领来平衡肩宽",
        "下身可以选择有图案或亮色的款式",
        "避免垫肩设计",
        "阔腿裤可以平衡上半身",
      ],
    },
    [BodyType.hourglass]: {
      bodyType: BodyType.hourglass,
      suitableStyles: ["fitted", "wrap", "belted", "high-waist"],
      avoidStyles: ["boxy", "oversized", "shapeless"],
      tips: [
        "突出腰线的款式最适合您",
        "合身的剪裁比宽松款更好",
        "高腰设计可以强调您的优势",
        "避免过于宽松或过于紧身",
      ],
    },
    [BodyType.oval]: {
      bodyType: BodyType.oval,
      suitableStyles: ["v-neck", "a-line", "empire", "flowy"],
      avoidStyles: ["tight", "crop-top", "high-neck"],
      tips: [
        "选择V领或开领设计",
        "垂直条纹可以拉长视觉效果",
        "避免过于紧身或过于宽松的款式",
        "选择有垂感的面料",
      ],
    },
  };

  private readonly colorSeasonProfiles: Record<
    ColorSeason,
    ColorSeasonProfile
  > = {
    [ColorSeason.spring]: {
      season: ColorSeason.spring,
      bestColors: [
        "coral",
        "peach",
        "salmon",
        "warm pink",
        "golden yellow",
        "cream",
        "ivory",
        "warm green",
        "turquoise",
        "light blue",
      ],
      avoidColors: ["black", "pure white", "cool gray", "burgundy", "navy"],
      metalTone: "gold",
      description: "春季型人适合温暖明亮的色彩，如珊瑚色、桃色、金黄色",
    },
    [ColorSeason.summer]: {
      season: ColorSeason.summer,
      bestColors: [
        "lavender",
        "soft pink",
        "rose",
        "mauve",
        "powder blue",
        "soft gray",
        "cool white",
        "berry",
        "cool green",
        "periwinkle",
      ],
      avoidColors: ["bright orange", "mustard", "rust", "bright red", "gold"],
      metalTone: "silver",
      description: "夏季型人适合柔和的冷色调，如薰衣草色、粉色、浅蓝色",
    },
    [ColorSeason.autumn]: {
      season: ColorSeason.autumn,
      bestColors: [
        "rust",
        "terracotta",
        "mustard",
        "olive",
        "camel",
        "chocolate",
        "warm brown",
        "burnt orange",
        "forest green",
        "cream",
      ],
      avoidColors: [
        "bright pink",
        "pure white",
        "cool blue",
        "fuchsia",
        "silver",
      ],
      metalTone: "gold",
      description: "秋季型人适合温暖的大地色系，如驼色、棕色、橄榄绿",
    },
    [ColorSeason.winter]: {
      season: ColorSeason.winter,
      bestColors: [
        "pure white",
        "black",
        "true red",
        "royal blue",
        "emerald",
        "fuchsia",
        "burgundy",
        "hot pink",
        "cobalt",
        "silver gray",
      ],
      avoidColors: ["orange", "beige", "rust", "mustard", "warm brown"],
      metalTone: "silver",
      description: "冬季型人适合高饱和度的冷色调，如正红色、纯白色、宝蓝色",
    },
  };

  private readonly skinToneColors: Record<SkinTone, string[]> = {
    [SkinTone.fair]: [
      "white",
      "pink",
      "light blue",
      "lavender",
      "peach",
      "soft coral",
    ],
    [SkinTone.light]: [
      "coral",
      "turquoise",
      "warm beige",
      "rose",
      "mint",
      "soft yellow",
    ],
    [SkinTone.medium]: [
      "olive",
      "mustard",
      "burgundy",
      "teal",
      "rust",
      "warm brown",
    ],
    [SkinTone.olive]: [
      "earth tones",
      "gold",
      "cream",
      "forest green",
      "maroon",
      "terracotta",
    ],
    [SkinTone.tan]: [
      "white",
      "bright colors",
      "coral",
      "emerald",
      "navy",
      "orange",
    ],
    [SkinTone.dark]: [
      "jewel tones",
      "bright white",
      "vibrant colors",
      "gold",
      "silver",
      "royal blue",
    ],
  };

  analyzeColorHarmony(colors: string[]): ColorHarmony[] {
    const results: ColorHarmony[] = [];
    const normalizedColors = colors.map((c) => c.toLowerCase());

    const complementaryMatch = this.checkComplementary(normalizedColors);
    if (complementaryMatch) {
      results.push(complementaryMatch);
    }

    const analogousMatch = this.checkAnalogous(normalizedColors);
    if (analogousMatch) {
      results.push(analogousMatch);
    }

    const triadicMatch = this.checkTriadic(normalizedColors);
    if (triadicMatch) {
      results.push(triadicMatch);
    }

    const monochromaticMatch = this.checkMonochromatic(normalizedColors);
    if (monochromaticMatch) {
      results.push(monochromaticMatch);
    }

    return results.sort((a, b) => b.score - a.score);
  }

  private checkComplementary(colors: string[]): ColorHarmony | null {
    for (const pair of this.colorHarmonyRules.complementary.pairs) {
      const [c1, c2] = pair;
      if (!c1 || !c2) {
        continue;
      }

      if (
        (colors.some((c) => c.includes(c1)) &&
          colors.some((c) => c.includes(c2))) ||
        (colors.some((c) => c.includes(c2)) &&
          colors.some((c) => c.includes(c1)))
      ) {
        return {
          type: "complementary",
          colors: [c1, c2],
          score: this.colorHarmonyRules.complementary.score,
          description: this.colorHarmonyRules.complementary.description,
        };
      }
    }
    return null;
  }

  private checkAnalogous(colors: string[]): ColorHarmony | null {
    for (const group of this.colorHarmonyRules.analogous.groups) {
      const matchCount = group.filter((g) =>
        colors.some((c) => c.includes(g)),
      ).length;

      if (matchCount >= 2) {
        return {
          type: "analogous",
          colors: group,
          score: this.colorHarmonyRules.analogous.score,
          description: this.colorHarmonyRules.analogous.description,
        };
      }
    }
    return null;
  }

  private checkTriadic(colors: string[]): ColorHarmony | null {
    for (const set of this.colorHarmonyRules.triadic.sets) {
      const matchCount = set.filter((s) =>
        colors.some((c) => c.includes(s)),
      ).length;

      if (matchCount >= 2) {
        return {
          type: "triadic",
          colors: set,
          score: this.colorHarmonyRules.triadic.score,
          description: this.colorHarmonyRules.triadic.description,
        };
      }
    }
    return null;
  }

  private checkMonochromatic(colors: string[]): ColorHarmony | null {
    const colorGroups: Record<string, string[]> = {
      red: ["red", "pink", "burgundy", "maroon", "coral", "rose"],
      blue: ["blue", "navy", "teal", "cyan", "azure", "indigo"],
      green: ["green", "olive", "emerald", "mint", "forest", "sage"],
      brown: ["brown", "tan", "beige", "camel", "chocolate", "coffee"],
      gray: ["gray", "grey", "silver", "slate", "ash", "charcoal"],
    };

    for (const [baseColor, variants] of Object.entries(colorGroups)) {
      const matchCount = variants.filter((v) =>
        colors.some((c) => c.includes(v)),
      ).length;

      if (matchCount >= 2) {
        return {
          type: "monochromatic",
          colors: [baseColor],
          score: this.colorHarmonyRules.monochromatic.score,
          description: this.colorHarmonyRules.monochromatic.description,
        };
      }
    }
    return null;
  }

  getBodyTypeRecommendation(bodyType: BodyType): BodyTypeRecommendation {
    return this.bodyTypeRecommendations[bodyType];
  }

  getColorSeasonProfile(colorSeason: ColorSeason): ColorSeasonProfile {
    return this.colorSeasonProfiles[colorSeason];
  }

  getFlatteringColors(skinTone: SkinTone): string[] {
    return this.skinToneColors[skinTone] || [];
  }

  calculateColorCompatibility(
    color1: string,
    color2: string,
    colorSeason?: ColorSeason,
  ): { score: number; reasons: string[] } {
    let score = 0.5;
    const reasons: string[] = [];

    const harmony = this.analyzeColorHarmony([color1, color2]);
    const topHarmony = harmony[0];
    if (topHarmony) {
      score = Math.max(score, topHarmony.score);
      reasons.push(topHarmony.description);
    }

    if (colorSeason) {
      const profile = this.colorSeasonProfiles[colorSeason];
      const c1 = color1.toLowerCase();
      const c2 = color2.toLowerCase();

      const isBest1 = profile.bestColors.some(
        (bc) => c1.includes(bc) || bc.includes(c1),
      );
      const isBest2 = profile.bestColors.some(
        (bc) => c2.includes(bc) || bc.includes(c2),
      );

      if (isBest1 && isBest2) {
        score += 0.2;
        reasons.push(`都适合${this.getColorSeasonName(colorSeason)}型`);
      } else if (isBest1 || isBest2) {
        score += 0.1;
      }

      const isAvoid1 = profile.avoidColors.some(
        (ac) => c1.includes(ac) || ac.includes(c1),
      );
      const isAvoid2 = profile.avoidColors.some(
        (ac) => c2.includes(ac) || ac.includes(c2),
      );

      if (isAvoid1 || isAvoid2) {
        score -= 0.1;
      }
    }

    return {
      score: Math.max(0, Math.min(1, score)),
      reasons: reasons.length > 0 ? reasons : ["颜色搭配"],
    };
  }

  calculateOutfitScore(params: {
    bodyType?: BodyType;
    skinTone?: SkinTone;
    colorSeason?: ColorSeason;
    itemColors: string[];
    itemStyles: string[];
    occasion?: string;
  }): {
    score: number;
    breakdown: Record<string, number>;
    suggestions: string[];
  } {
    const breakdown: Record<string, number> = {};
    const suggestions: string[] = [];

    let totalScore = 0;
    let factorCount = 0;

    if (params.bodyType) {
      const rec = this.bodyTypeRecommendations[params.bodyType];
      const styleMatch = params.itemStyles.filter((s) =>
        rec.suitableStyles.includes(s.toLowerCase()),
      ).length;
      const styleAvoid = params.itemStyles.filter((s) =>
        rec.avoidStyles.includes(s.toLowerCase()),
      ).length;

      const bodyScore = Math.max(0, 0.5 + styleMatch * 0.1 - styleAvoid * 0.15);
      breakdown["体型适配"] = bodyScore;
      totalScore += bodyScore;
      factorCount++;

      if (styleAvoid > 0) {
        suggestions.push(`建议避免: ${rec.avoidStyles.join(", ")}`);
      }
    }

    if (params.itemColors.length >= 2) {
      const harmonies = this.analyzeColorHarmony(params.itemColors);
      const primaryHarmony = harmonies[0];
      const colorScore = primaryHarmony?.score ?? 0.5;
      breakdown["色彩和谐"] = colorScore;
      totalScore += colorScore;
      factorCount++;

      if (primaryHarmony) {
        suggestions.push(primaryHarmony.description);
      }
    }

    if (params.colorSeason && params.itemColors.length > 0) {
      const profile = this.colorSeasonProfiles[params.colorSeason];
      const goodColors = params.itemColors.filter((c) =>
        profile.bestColors.some((bc) => c.includes(bc) || bc.includes(c)),
      ).length;

      const seasonScore = goodColors / params.itemColors.length;
      breakdown["季节色彩"] = seasonScore;
      totalScore += seasonScore;
      factorCount++;

      if (goodColors < params.itemColors.length) {
        suggestions.push(
          `推荐颜色: ${profile.bestColors.slice(0, 5).join(", ")}`,
        );
      }
    }

    if (params.skinTone && params.itemColors.length > 0) {
      const flattering = this.skinToneColors[params.skinTone];
      const matchedColors = params.itemColors.filter((c) =>
        flattering.some((fc) => c.includes(fc) || fc.includes(c)),
      ).length;

      const skinScore = matchedColors / params.itemColors.length;
      breakdown["肤色匹配"] = skinScore;
      totalScore += skinScore;
      factorCount++;
    }

    const avgScore = factorCount > 0 ? totalScore / factorCount : 0.5;

    return {
      score: Math.round(avgScore * 100) / 100,
      breakdown,
      suggestions: suggestions.slice(0, 3),
    };
  }

  private getColorSeasonName(season: ColorSeason): string {
    const names: Record<ColorSeason, string> = {
      [ColorSeason.spring]: "春季",
      [ColorSeason.summer]: "夏季",
      [ColorSeason.autumn]: "秋季",
      [ColorSeason.winter]: "冬季",
    };
    return names[season];
  }

  getOccasionStyleGuide(occasion: string): {
    suitableStyles: string[];
    suitableColors: string[];
    tips: string[];
  } {
    const guides: Record<
      string,
      { suitableStyles: string[]; suitableColors: string[]; tips: string[] }
    > = {
      work: {
        suitableStyles: ["business", "formal", "classic", "minimalist"],
        suitableColors: ["navy", "black", "gray", "white", "beige", "burgundy"],
        tips: ["选择合身的剪裁", "颜色以沉稳为主", "配饰简洁大方"],
      },
      date: {
        suitableStyles: ["romantic", "elegant", "casual", "trendy"],
        suitableColors: ["red", "pink", "navy", "black", "soft colors"],
        tips: ["展现个人风格", "颜色可以选择柔和或浪漫的色调", "注意细节搭配"],
      },
      party: {
        suitableStyles: ["trendy", "glamorous", "edgy", "chic"],
        suitableColors: ["black", "gold", "silver", "red", "jewel tones"],
        tips: [
          "可以大胆尝试亮片或金属元素",
          "配饰可以夸张一些",
          "颜色可以更鲜艳",
        ],
      },
      sport: {
        suitableStyles: ["sporty", "casual", "athleisure"],
        suitableColors: ["black", "gray", "navy", "bright colors", "white"],
        tips: ["选择透气舒适的面料", "运动鞋是必备", "颜色可以活泼"],
      },
      daily: {
        suitableStyles: ["casual", "minimalist", "comfortable"],
        suitableColors: ["jeans blue", "white", "black", "beige", "gray"],
        tips: ["舒适为主", "基础款百搭", "可以加入个性配饰"],
      },
    };

    return (
      guides[occasion] ??
      guides.daily ?? {
        suitableStyles: [],
        suitableColors: [],
        tips: [],
      }
    );
  }

  calculateTheoryBasedScore(
    item: {
      colors?: unknown;
      attributes?: unknown;
      tags?: unknown;
    },
    userProfile: {
      bodyType?: BodyType | null;
      colorSeason?: ColorSeason | null;
    } | null,
    context?: { occasion?: string },
  ): number {
    let score = 0.5;
    const itemColors = Array.isArray(item.colors)
      ? item.colors.filter((color: unknown): color is string => typeof color === "string")
      : [];
    const attributes = item.attributes as { style?: unknown } | null | undefined;
    const itemStyles = Array.isArray(attributes?.style)
      ? attributes.style.filter(
          (style: unknown): style is string => typeof style === "string",
        )
      : [];
    const itemTags = Array.isArray(item.tags)
      ? item.tags.filter((tag: unknown): tag is string => typeof tag === "string")
      : [];
    const bodyType = userProfile?.bodyType as BodyType | undefined;

    if (bodyType) {
      const rec = this.bodyTypeRecommendations[bodyType];
      const styleMatch = [...itemStyles, ...itemTags].filter((s: string) =>
        rec.suitableStyles.some(
          (rs: string) =>
            s.toLowerCase().includes(rs) || rs.includes(s.toLowerCase()),
        ),
      ).length;
      const styleAvoid = [...itemStyles, ...itemTags].filter((s: string) =>
        rec.avoidStyles.some(
          (rs: string) =>
            s.toLowerCase().includes(rs) || rs.includes(s.toLowerCase()),
        ),
      ).length;

      score += styleMatch * 0.05 - styleAvoid * 0.1;
    }

    const colorSeason = userProfile?.colorSeason as ColorSeason | undefined;

    if (colorSeason && itemColors.length > 0) {
      const profile = this.colorSeasonProfiles[colorSeason];
      const goodColors = itemColors.filter((c: string) =>
        profile.bestColors.some(
          (bc: string) =>
            c.toLowerCase().includes(bc) || bc.includes(c.toLowerCase()),
        ),
      ).length;

      score += (goodColors / itemColors.length) * 0.2;
    }

    if (context?.occasion) {
      const guide = this.getOccasionStyleGuide(context.occasion);
      const styleMatch = [...itemStyles, ...itemTags].filter((s: string) =>
        guide.suitableStyles.some(
          (gs) => s.toLowerCase().includes(gs) || gs.includes(s.toLowerCase()),
        ),
      ).length;

      score += styleMatch * 0.05;
    }

    return Math.max(0, Math.min(1, score));
  }
}
