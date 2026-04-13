export interface PosterTemplate {
  width: number;
  height: number;
  background: string;
  header: {
    y: number;
    height: number;
    backgroundColor: string;
    titleColor: string;
    subtitleColor: string;
    titleFontSize: number;
    subtitleFontSize: number;
  };
  bodySection: {
    y: number;
    paddingX: number;
    sectionGap: number;
    cardBackgroundColor: string;
    cardBorderRadius: number;
    cardPadding: number;
    labelColor: string;
    labelFontSize: number;
    valueColor: string;
    valueFontSize: number;
  };
  colorPalette: {
    y: number;
    swatchSize: number;
    swatchGap: number;
    labelColor: string;
  };
  styleTags: {
    y: number;
    tagHeight: number;
    tagGap: number;
    tagPaddingH: number;
    tagBorderRadius: number;
    tagFontSize: number;
  };
  bodyAdvice: {
    y: number;
    fontSize: number;
    lineHeight: number;
    color: string;
  };
  qrCode: {
    y: number;
    size: number;
    labelColor: string;
    labelFontSize: number;
  };
  footer: {
    y: number;
    color: string;
    fontSize: number;
  };
}

export const baseTemplate: PosterTemplate = {
  width: 750,
  height: 1334,
  background: "#FFFFFF",
  header: {
    y: 0,
    height: 260,
    backgroundColor: "#333333",
    titleColor: "#FFFFFF",
    subtitleColor: "rgba(255, 255, 255, 0.85)",
    titleFontSize: 42,
    subtitleFontSize: 28,
  },
  bodySection: {
    y: 280,
    paddingX: 40,
    sectionGap: 24,
    cardBackgroundColor: "#FFFFFF",
    cardBorderRadius: 16,
    cardPadding: 24,
    labelColor: "#999999",
    labelFontSize: 24,
    valueColor: "#333333",
    valueFontSize: 28,
  },
  colorPalette: {
    y: 0,
    swatchSize: 64,
    swatchGap: 16,
    labelColor: "#999999",
  },
  styleTags: {
    y: 0,
    tagHeight: 52,
    tagGap: 16,
    tagPaddingH: 24,
    tagBorderRadius: 26,
    tagFontSize: 24,
  },
  bodyAdvice: {
    y: 0,
    fontSize: 24,
    lineHeight: 40,
    color: "#666666",
  },
  qrCode: {
    y: 1100,
    size: 160,
    labelColor: "#999999",
    labelFontSize: 20,
  },
  footer: {
    y: 1300,
    color: "#CCCCCC",
    fontSize: 20,
  },
};
