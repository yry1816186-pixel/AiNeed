export interface UserProfile {
  id: string;
  userId: string;
  bodyType?: BodyType;
  skinTone?: SkinTone;
  faceShape?: FaceShape;
  height?: number;
  weight?: number;
  measurements?: BodyMeasurements;
  stylePreferences: StylePreference[];
  colorPreferences: ColorSeason[];
  createdAt: Date;
  updatedAt: Date;
}

export enum BodyType {
  Rectangle = 'rectangle',
  Triangle = 'triangle',
  InvertedTriangle = 'inverted_triangle',
  Hourglass = 'hourglass',
  Oval = 'oval',
}

export enum SkinTone {
  Fair = 'fair',
  Light = 'light',
  Medium = 'medium',
  Olive = 'olive',
  Tan = 'tan',
  Dark = 'dark',
}

export enum FaceShape {
  Oval = 'oval',
  Round = 'round',
  Square = 'square',
  Heart = 'heart',
  Oblong = 'oblong',
  Diamond = 'diamond',
}

export enum ColorSeason {
  SpringWarm = 'spring_warm',
  SpringLight = 'spring_light',
  SummerCool = 'summer_cool',
  SummerLight = 'summer_light',
  AutumnWarm = 'autumn_warm',
  AutumnDeep = 'autumn_deep',
  WinterCool = 'winter_cool',
  WinterDeep = 'winter_deep',
}

export interface BodyMeasurements {
  shoulder?: number;
  bust?: number;
  waist?: number;
  hip?: number;
  inseam?: number;
}

export interface StylePreference {
  id: string;
  name: string;
  category: StyleCategory;
}

export enum StyleCategory {
  Casual = 'casual',
  Formal = 'formal',
  Business = 'business',
  Sporty = 'sporty',
  Bohemian = 'bohemian',
  Minimalist = 'minimalist',
  Streetwear = 'streetwear',
  Vintage = 'vintage',
}
