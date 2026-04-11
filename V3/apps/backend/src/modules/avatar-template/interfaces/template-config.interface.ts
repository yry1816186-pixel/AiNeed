export interface DrawingConfigComponent {
  componentId: string;
  offsetX: number;
  offsetY: number;
}

export interface ClothingSlot {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}

export interface DrawingConfig {
  head: { path: string; width: number; height: number };
  eyes: DrawingConfigComponent[];
  mouth: DrawingConfigComponent;
  nose: DrawingConfigComponent;
  hair: { svgPath: string; zIndex: number };
  body: { path: string; width: number; height: number };
  clothingSlots: {
    top: ClothingSlot;
    bottom: ClothingSlot;
    shoes: ClothingSlot;
    outerwear: ClothingSlot;
  };
}

export interface NumericParameter {
  min: number;
  max: number;
  default: number;
  label: string;
}

export interface OptionParameter {
  options: string[];
  default: string;
  label: string;
}

export interface TemplateParameters {
  faceShape: NumericParameter;
  eyeType: OptionParameter;
  skinTone: OptionParameter;
  hairId: OptionParameter;
}

export const GENDER_VALUES = ['male', 'female', 'neutral'] as const;
export type Gender = (typeof GENDER_VALUES)[number];
