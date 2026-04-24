import { PosterTemplate, baseTemplate } from "../base-template";

export const summerTemplate: PosterTemplate = {
  ...baseTemplate,
  background: "#F0F4FF",
  header: {
    ...baseTemplate.header,
    backgroundColor: "#9FA8DA",
  },
  colorPalette: {
    ...baseTemplate.colorPalette,
  },
};

export const summerColorHexes: string[] = [
  "#F48FB1",
  "#CE93D8",
  "#90CAF9",
  "#EF9A9A",
  "#80CBC4",
  "#B39DDB",
  "#90A4AE",
];

export const summerColorNames: string[] = [
  "粉色",
  "薰衣草色",
  "浅蓝色",
  "玫瑰色",
  "薄荷绿",
  "淡紫色",
  "雾蓝色",
];
