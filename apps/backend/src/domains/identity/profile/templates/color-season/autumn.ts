/* eslint-disable @typescript-eslint/no-explicit-any */
import { PosterTemplate, baseTemplate } from "../base-template";

export const autumnTemplate: PosterTemplate = {
  ...baseTemplate,
  background: "#FDF5E6",
  header: {
    ...baseTemplate.header,
    backgroundColor: "#A1887F",
  },
  colorPalette: {
    ...baseTemplate.colorPalette,
  },
};

export const autumnColorHexes: string[] = [
  "#A1887F",
  "#8D6E63",
  "#9E9D24",
  "#D84315",
  "#F9A825",
  "#FF6F00",
  "#880E4F",
];

export const autumnColorNames: string[] = [
  "驼色",
  "棕色",
  "橄榄绿",
  "铁锈红",
  "芥末黄",
  "南瓜色",
  "酒红色",
];
