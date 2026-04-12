import { Skia } from '@shopify/react-native-skia';
import type { MouthStyle, DrawingContext } from '../types';

const MOUTH_COLOR = '#D4736A';
const MOUTH_DARK = '#B85A52';

interface MouthDrawResult {
  mouthPath: ReturnType<typeof Skia.Path.Make>;
}

function drawSmileMouth(cx: number, cy: number, headRadius: number): ReturnType<typeof Skia.Path.Make> {
  const w = headRadius * 0.25;
  const h = headRadius * 0.08;
  const mouthY = cy + headRadius * 0.35;
  const path = Skia.Path.Make();
  path.moveTo(cx - w, mouthY);
  path.quadTo(cx, mouthY + h * 3, cx + w, mouthY);
  path.close();
  return path;
}

function drawSurprisedMouth(cx: number, cy: number, headRadius: number): ReturnType<typeof Skia.Path.Make> {
  const mouthR = headRadius * 0.1;
  const mouthY = cy + headRadius * 0.35;
  const path = Skia.Path.Make();
  path.addOval({
    x: cx - mouthR,
    y: mouthY - mouthR * 1.2,
    width: mouthR * 2,
    height: mouthR * 2.4,
  });
  return path;
}

function drawHappyMouth(cx: number, cy: number, headRadius: number): ReturnType<typeof Skia.Path.Make> {
  const w = headRadius * 0.35;
  const h = headRadius * 0.15;
  const mouthY = cy + headRadius * 0.3;
  const path = Skia.Path.Make();
  path.moveTo(cx - w, mouthY);
  path.quadTo(cx, mouthY + h * 4, cx + w, mouthY);
  path.quadTo(cx, mouthY + h * 1.5, cx - w, mouthY);
  path.close();
  return path;
}

const MOUTH_DRAWERS: Record<MouthStyle, (cx: number, cy: number, headRadius: number) => ReturnType<typeof Skia.Path.Make>> = {
  smile: drawSmileMouth,
  surprised: drawSurprisedMouth,
  happy: drawHappyMouth,
};

export function drawMouth(ctx: DrawingContext): MouthDrawResult {
  const { cx, cy, headRadius, params, transform } = ctx;
  const adjustedCy = cy + transform.headTranslateY;
  const drawer = MOUTH_DRAWERS[params.mouthStyle];
  const mouthPath = drawer(cx, adjustedCy, headRadius);

  return { mouthPath };
}

export function drawNose(ctx: DrawingContext): { nosePath: ReturnType<typeof Skia.Path.Make> } {
  const { cx, cy, headRadius, transform } = ctx;
  const noseY = cy + headRadius * 0.15 + transform.headTranslateY;
  const noseR = headRadius * 0.04;
  const nosePath = Skia.Path.Make();
  nosePath.addCircle(cx, noseY, noseR);

  return { nosePath };
}
