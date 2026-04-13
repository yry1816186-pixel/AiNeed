import type {
  BodyType,
  SkinTone,
  FaceShape,
  ColorSeasonType,
} from './enums';

export interface BodyTypeAnalysis {
  bodyType?: BodyType;
  skinTone?: SkinTone;
  faceShape?: FaceShape;
  colorSeason?: ColorSeasonType;
  confidence: number;
  shoulderWidth?: number;
  bustWaistRatio?: number;
  waistHipRatio?: number;
  rawResult?: Record<string, unknown>;
  analyzedAt?: string;
}

export interface ColorSeasonProfile {
  type: ColorSeasonType;
  label: string;
  description: string;
  bestColors: string[];
  avoidColors: string[];
  neutralColors: string[];
  accentColors: string[];
}

export interface ColorPalette {
  id: string;
  name: string;
  season: ColorSeasonType;
  colors: ColorSwatch[];
  isDefault: boolean;
}

export interface ColorSwatch {
  hex: string;
  name: string;
  category: 'neutral' | 'accent' | 'avoid';
}

export interface StyleProfile {
  id: string;
  userId: string;
  name: string;
  occasion: string;
  description: string;
  keywords: string[];
  palette: string[];
  confidence: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
