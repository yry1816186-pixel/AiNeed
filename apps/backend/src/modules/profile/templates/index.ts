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
  [ColorSeason.spring_warm]: {
    template: springTemplate,
    colorHexes: springColorHexes,
    colorNames: springColorNames,
  },
  [ColorSeason.spring_light]: {
    template: springTemplate,
    colorHexes: springColorHexes,
    colorNames: springColorNames,
  },
  [ColorSeason.summer_cool]: {
    template: summerTemplate,
    colorHexes: summerColorHexes,
    colorNames: summerColorNames,
  },
  [ColorSeason.summer_light]: {
    template: summerTemplate,
    colorHexes: summerColorHexes,
    colorNames: summerColorNames,
  },
  [ColorSeason.autumn_warm]: {
    template: autumnTemplate,
    colorHexes: autumnColorHexes,
    colorNames: autumnColorNames,
  },
  [ColorSeason.autumn_deep]: {
    template: autumnTemplate,
    colorHexes: autumnColorHexes,
    colorNames: autumnColorNames,
  },
  [ColorSeason.winter_cool]: {
    template: winterTemplate,
    colorHexes: winterColorHexes,
    colorNames: winterColorNames,
  },
  [ColorSeason.winter_deep]: {
    template: winterTemplate,
    colorHexes: winterColorHexes,
    colorNames: winterColorNames,
  },
};

export function getTemplateByColorSeason(season: ColorSeason | null): ColorSeasonConfig {
  if (season && seasonConfigs[season]) {
    return seasonConfigs[season];
  }
  return seasonConfigs[ColorSeason.spring_warm];
}
