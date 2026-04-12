import { Skia } from '@shopify/react-native-skia';
import { SKIN_COLORS, type DrawingContext } from '../types';

const BODY_COLOR = '#F5F5F5';

export interface BodyDrawResult {
  bodyPath: ReturnType<typeof Skia.Path.Make>;
  bodyColor: string;
  leftArmPath: ReturnType<typeof Skia.Path.Make>;
  rightArmPath: ReturnType<typeof Skia.Path.Make>;
  armColor: string;
  bodyCx: number;
  bodyTopY: number;
  bodyWidth: number;
  bodyHeight: number;
  leftArmRotation: number;
  rightArmRotation: number;
}

export function drawBody(ctx: DrawingContext): BodyDrawResult {
  const { cx, cy, headRadius, params, transform } = ctx;
  const skinColor = SKIN_COLORS[params.skinTone];

  const bodyTopY = cy + headRadius * 1.05 + transform.bodyTranslateY;
  const bodyWidth = headRadius * 1.4;
  const bodyHeight = headRadius * 1.8;
  const bodyRx = headRadius * 0.35;

  const bodyPath = Skia.Path.Make();
  bodyPath.addRRect({
    rect: { x: cx - bodyWidth / 2, y: bodyTopY, width: bodyWidth, height: bodyHeight },
    rx: bodyRx,
    ry: bodyRx,
  });

  const armWidth = headRadius * 0.3;
  const armHeight = headRadius * 1.2;
  const armRx = headRadius * 0.12;

  const leftArmPath = Skia.Path.Make();
  leftArmPath.addRRect({
    rect: { x: cx - bodyWidth / 2 - armWidth + headRadius * 0.05, y: bodyTopY + headRadius * 0.15, width: armWidth, height: armHeight },
    rx: armRx,
    ry: armRx,
  });

  const rightArmPath = Skia.Path.Make();
  rightArmPath.addRRect({
    rect: { x: cx + bodyWidth / 2 - headRadius * 0.05, y: bodyTopY + headRadius * 0.15, width: armWidth, height: armHeight },
    rx: armRx,
    ry: armRx,
  });

  return {
    bodyPath,
    bodyColor: BODY_COLOR,
    leftArmPath,
    rightArmPath,
    armColor: skinColor,
    bodyCx: cx,
    bodyTopY,
    bodyWidth,
    bodyHeight,
    leftArmRotation: transform.leftArmRotation,
    rightArmRotation: transform.rightArmRotation,
  };
}

export function drawLegs(ctx: DrawingContext): { legsPath: ReturnType<typeof Skia.Path.Make>; color: string } {
  const { cx, cy, headRadius, transform } = ctx;
  const bodyTopY = cy + headRadius * 1.05 + transform.bodyTranslateY;
  const bodyHeight = headRadius * 1.8;
  const legTopY = bodyTopY + bodyHeight - headRadius * 0.1;
  const legWidth = headRadius * 0.35;
  const legHeight = headRadius * 0.9;
  const legRx = headRadius * 0.12;
  const gap = headRadius * 0.08;

  const legsPath = Skia.Path.Make();
  legsPath.addRRect({
    rect: { x: cx - legWidth - gap / 2, y: legTopY, width: legWidth, height: legHeight },
    rx: legRx,
    ry: legRx,
  });
  legsPath.addRRect({
    rect: { x: cx + gap / 2, y: legTopY, width: legWidth, height: legHeight },
    rx: legRx,
    ry: legRx,
  });

  return { legsPath, color: BODY_COLOR };
}
