import { Skia } from '@shopify/react-native-skia';
import { SKIN_COLORS, type DrawingContext } from '../types';

export function drawHead(ctx: DrawingContext) {
  const { cx, cy, headRadius, params, transform } = ctx;
  const skinColor = SKIN_COLORS[params.skinTone];

  const paint = Skia.Paint();
  paint.setAntiAlias(true);

  paint.setColor(Skia.Color(skinColor));
  const headPath = Skia.Path.Make();
  headPath.addCircle(cx, cy, headRadius);

  const highlightPaint = Skia.Paint();
  highlightPaint.setAntiAlias(true);
  const highlightColor = Skia.Color(skinColor);
  const highlightShader = Skia.Shader.MakeLinearGradient(
    { x: cx - headRadius * 0.3, y: cy - headRadius },
    { x: cx + headRadius * 0.3, y: cy + headRadius },
    [highlightColor, Skia.Color('rgba(255,255,255,0.15)')],
    [0, 1],
    0,
  );
  highlightPaint.setShader(highlightShader);

  return {
    headPath,
    paint,
    highlightPath: headPath,
    highlightPaint,
    headCx: cx,
    headCy: cy + transform.headTranslateY,
    headScaleX: transform.headScaleX,
    headScaleY: transform.headScaleY,
    headRotation: transform.headRotation,
  };
}
