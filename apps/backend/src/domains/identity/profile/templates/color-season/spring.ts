import { PosterTemplate, baseTemplate } from "../base-template";

export const springTemplate: PosterTemplate = {
  ...baseTemplate,
  background: "#FFF8F0",
  header: {
    ...baseTemplate.header,
    backgroundColor: "#FF9A76",
  },
  colorPalette: {
    ...baseTemplate.colorPalette,
  },
};

export const springColorHexes: string[] = [
  "#FF7F7F",
  "#FFB7B2",
  "#FFAB91",
  "#FFD54F",
  "#81C784",
  "#64B5F6",
  "#FFFFF0",
];

export const springColorNames: string[] = [
  "珊瑚色",
  "桃色",
  "杏色",
  "暖黄色",
  "草绿色",
  "天蓝色",
  "象牙白",
];
