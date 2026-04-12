import { Skia } from '@shopify/react-native-skia';
import type { EyeStyle, DrawingContext } from '../types';

interface EyeDrawResult {
  leftEyePath: ReturnType<typeof Skia.Path.Make>;
  rightEyePath: ReturnType<typeof Skia.Path.Make>;
  leftPupilPath: ReturnType<typeof Skia.Path.Make>;
  rightPupilPath: ReturnType<typeof Skia.Path.Make>;
  leftHighlightPath: ReturnType<typeof Skia.Path.Make>;
  rightHighlightPath: ReturnType<typeof Skia.Path.Make>;
  squint: number;
}

function drawRoundEyes(
  cx: number,
  cy: number,
  r: number,
  squint: number,
): { eye: ReturnType<typeof Skia.Path.Make>; pupil: ReturnType<typeof Skia.Path.Make>; highlight: ReturnType<typeof Skia.Path.Make> } {
  const eyeH = r * (1 - squint * 0.6);
  const eye = Skia.Path.Make();
  eye.addOval({ x: cx - r, y: cy - eyeH, width: r * 2, height: eyeH * 2 });

  const pupilR = r * 0.5;
  const pupil = Skia.Path.Make();
  pupil.addCircle(cx, cy, pupilR);

  const hlR = r * 0.2;
  const highlight = Skia.Path.Make();
  highlight.addCircle(cx + r * 0.25, cy - eyeH * 0.3, hlR);

  return { eye, pupil, highlight };
}

function drawAlmondEyes(
  cx: number,
  cy: number,
  r: number,
  squint: number,
): { eye: ReturnType<typeof Skia.Path.Make>; pupil: ReturnType<typeof Skia.Path.Make>; highlight: ReturnType<typeof Skia.Path.Make> } {
  const w = r * 1.3;
  const h = r * (0.7 - squint * 0.4);
  const eye = Skia.Path.Make();
  eye.moveTo(cx - w, cy);
  eye.quadTo(cx, cy - h * 2, cx + w, cy);
  eye.quadTo(cx, cy + h * 2, cx - w, cy);
  eye.close();

  const pupilR = r * 0.4;
  const pupil = Skia.Path.Make();
  pupil.addCircle(cx, cy, pupilR);

  const hlR = r * 0.18;
  const highlight = Skia.Path.Make();
  highlight.addCircle(cx + r * 0.2, cy - h * 0.4, hlR);

  return { eye, pupil, highlight };
}

function drawCatEyes(
  cx: number,
  cy: number,
  r: number,
  squint: number,
): { eye: ReturnType<typeof Skia.Path.Make>; pupil: ReturnType<typeof Skia.Path.Make>; highlight: ReturnType<typeof Skia.Path.Make> } {
  const w = r * 1.2;
  const h = r * (0.6 - squint * 0.35);
  const eye = Skia.Path.Make();
  eye.moveTo(cx - w, cy + h * 0.3);
  eye.quadTo(cx, cy - h * 2.5, cx + w, cy - h * 0.2);
  eye.quadTo(cx, cy + h * 1.5, cx - w, cy + h * 0.3);
  eye.close();

  const pupilW = r * 0.25;
  const pupilH = r * 0.45;
  const pupil = Skia.Path.Make();
  pupil.addOval({ x: cx - pupilW, y: cy - pupilH, width: pupilW * 2, height: pupilH * 2 });

  const hlR = r * 0.15;
  const highlight = Skia.Path.Make();
  highlight.addCircle(cx + r * 0.15, cy - h * 0.5, hlR);

  return { eye, pupil, highlight };
}

function drawDroopyEyes(
  cx: number,
  cy: number,
  r: number,
  squint: number,
): { eye: ReturnType<typeof Skia.Path.Make>; pupil: ReturnType<typeof Skia.Path.Make>; highlight: ReturnType<typeof Skia.Path.Make> } {
  const w = r * 1.1;
  const h = r * (0.65 - squint * 0.4);
  const eye = Skia.Path.Make();
  eye.moveTo(cx - w, cy - h * 0.5);
  eye.quadTo(cx, cy - h * 2, cx + w, cy + h * 0.3);
  eye.quadTo(cx, cy + h * 1.8, cx - w, cy - h * 0.5);
  eye.close();

  const pupilR = r * 0.42;
  const pupil = Skia.Path.Make();
  pupil.addCircle(cx, cy + h * 0.1, pupilR);

  const hlR = r * 0.17;
  const highlight = Skia.Path.Make();
  highlight.addCircle(cx + r * 0.2, cy - h * 0.2, hlR);

  return { eye, pupil, highlight };
}

const EYE_DRAWERS: Record<EyeStyle, typeof drawRoundEyes> = {
  round: drawRoundEyes,
  almond: drawAlmondEyes,
  cat: drawCatEyes,
  droopy: drawDroopyEyes,
};

export function drawEyes(ctx: DrawingContext): EyeDrawResult {
  const { cx, cy, headRadius, params, transform } = ctx;
  const eyeSpacing = headRadius * 0.45;
  const eyeY = cy - headRadius * 0.1 + transform.headTranslateY;
  const eyeR = headRadius * 0.18;
  const drawer = EYE_DRAWERS[params.eyeStyle];
  const squint = transform.eyeSquint;

  const left = drawer(cx - eyeSpacing, eyeY, eyeR, squint);
  const right = drawer(cx + eyeSpacing, eyeY, eyeR, squint);

  return {
    leftEyePath: left.eye,
    rightEyePath: right.eye,
    leftPupilPath: left.pupil,
    rightPupilPath: right.pupil,
    leftHighlightPath: left.highlight,
    rightHighlightPath: right.highlight,
    squint,
  };
}
