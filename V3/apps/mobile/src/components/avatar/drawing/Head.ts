import { Skia } from '@shopify/react-native-skia';
import { SKIN_COLORS, type DrawingContext } from '../types';

export function drawHead(ctx: DrawingContext) {
  const { cx, cy, headRadius, params, transform } = ctx;
  const skinColor = SKIN_COLORS[params.skinTone];

  const headPath = Skia.Path.Make();
  headPath.addCircle(cx, cy, headRadius);

  return {
    headPath,
    headCx: cx,
    headCy: cy + transform.headTranslateY,
    headScaleX: transform.headScaleX,
    headScaleY: transform.headScaleY,
    headRotation: transform.headRotation,
  };
}
