import { ColorSeason } from "@prisma/client";

import { PosterTemplate } from "./base-template";
import { springTemplate, springColorHexes, springColorNames } from "./color-season/spring";
import { summerTemplate, summerColorHexes, summerColorNames } from "./color-season/summer";
import { autumnTemplate, autumnColorHexes, autumnColorNames } from "./color-season/autumn";
import { winterTemplate, winterColorHexes, winterColorNames } from "./color-season/winter";

export { PosterTemplate } from "./base-template";

export interface ColorSeasonConfig {
  template: PosterTemplate;
  colorHexes: string[];
  colorNames: string[];
}

const seasonConfigs: Record<ColorSeason, ColorSeasonConfig> = {
  [ColorSeason.spring]: {
    template: springTemplate,
    colorHexes: springColorHexes,
    colorNames: springColorNames,
  },
  [ColorSeason.summer]: {
    template: summerTemplate,
    colorHexes: summerColorHexes,
    colorNames: summerColorNames,
  },
  [ColorSeason.autumn]: {
    template: autumnTemplate,
    colorHexes: autumnColorHexes,
    colorNames: autumnColorNames,
  },
  [ColorSeason.winter]: {
    template: winterTemplate,
    colorHexes: winterColorHexes,
    colorNames: winterColorNames,
  },
};

export function getTemplateByColorSeason(season: ColorSeason | null): ColorSeasonConfig {
  if (season && seasonConfigs[season]) {
    return seasonConfigs[season];
  }
  return seasonConfigs[ColorSeason.spring];
}
