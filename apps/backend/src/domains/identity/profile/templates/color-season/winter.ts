import { PosterTemplate, baseTemplate } from "../base-template";

export const winterTemplate: PosterTemplate = {
  ...baseTemplate,
  background: "#F5F5F5",
  header: {
    ...baseTemplate.header,
    backgroundColor: "#37474F",
  },
  colorPalette: {
    ...baseTemplate.colorPalette,
  },
};

export const winterColorHexes: string[] = [
  "#F44336",
  "#FFFFFF",
  "#212121",
  "#1565C0",
  "#2E7D32",
  "#6A1B9A",
  "#E91E63",
];

export const winterColorNames: string[] = [
  "正红色",
  "纯白色",
  "黑色",
  "宝蓝色",
  "翠绿色",
  "深紫色",
  "玫红色",
];
