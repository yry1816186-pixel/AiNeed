import type { SharedValue } from 'react-native-reanimated';

export type SkinTone = 'porcelain' | 'natural' | 'wheat' | 'honey' | 'deepBrown' | 'dark';

export const SKIN_COLORS: Record<SkinTone, string> = {
  porcelain: '#FFE4D6',
  natural: '#F5D0B0',
  wheat: '#E8B88A',
  honey: '#D4956A',
  deepBrown: '#A06840',
  dark: '#6B4423',
};

export type EyeStyle = 'round' | 'almond' | 'cat' | 'droopy';

export type MouthStyle = 'smile' | 'surprised' | 'happy';

export type HairStyle =
  | 'bob'
  | 'pixie'
  | 'shortStraight'
  | 'texturedShort'
  | 'longStraight'
  | 'longWavy'
  | 'bigWave'
  | 'layeredLong'
  | 'curly'
  | 'waterRipple'
  | 'spiralCurl'
  | 'afro'
  | 'ponytail'
  | 'twinTails'
  | 'bun'
  | 'twinBuns'
  | 'braid'
  | 'twinBraids'
  | 'buzzCut'
  | 'mohawk';

export type HairColor = 'black' | 'darkBrown' | 'lightBrown' | 'blonde' | 'redBrown' | 'gray';

export const HAIR_COLORS: Record<HairColor, string> = {
  black: '#1A1A1A',
  darkBrown: '#4A2C1A',
  lightBrown: '#8B6914',
  blonde: '#D4A843',
  redBrown: '#8B3A2A',
  gray: '#B0B0B0',
};

export type ClothingSlot = 'top' | 'bottom' | 'shoes' | 'outerwear';

export type ClothingType =
  | 'tshirt'
  | 'hoodie'
  | 'jacket'
  | 'dress'
  | 'jeans'
  | 'skirt'
  | 'shorts'
  | 'sneakers'
  | 'boots'
  | 'sandals'
  | 'heels'
  | 'coat';

export interface ClothingItem {
  type: ClothingType;
  color: string;
}

export type ClothingMap = Partial<Record<ClothingSlot, ClothingItem>>;

export type AnimationName = 'idle' | 'happy' | 'wave' | 'nod' | 'think' | 'heart' | 'dressTransition';

export interface AnimationState {
  name: AnimationName;
  startedAt: number;
}

export interface AvatarParams {
  skinTone: SkinTone;
  eyeStyle: EyeStyle;
  mouthStyle: MouthStyle;
  hairStyle: HairStyle;
  hairColor: HairColor;
}

export interface AnimationTransform {
  headScaleX: number;
  headScaleY: number;
  headTranslateY: number;
  headRotation: number;
  bodyTranslateY: number;
  rightArmRotation: number;
  leftArmRotation: number;
  eyeSquint: number;
  opacity: number;
}

export const DEFAULT_TRANSFORM: AnimationTransform = {
  headScaleX: 1,
  headScaleY: 1,
  headTranslateY: 0,
  headRotation: 0,
  bodyTranslateY: 0,
  rightArmRotation: 0,
  leftArmRotation: 0,
  eyeSquint: 0,
  opacity: 1,
};

export interface DrawingContext {
  cx: number;
  cy: number;
  size: number;
  headRadius: number;
  params: AvatarParams;
  clothingMap: ClothingMap;
  transform: AnimationTransform;
  sharedValues: Record<string, SharedValue<number>>;
}
