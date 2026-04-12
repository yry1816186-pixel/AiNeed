import { Skia } from '@shopify/react-native-skia';
import { HAIR_COLORS, type HairStyle, type DrawingContext } from '../types';

interface HairDrawResult {
  hairPath: ReturnType<typeof Skia.Path.Make>;
}

function rrect(x: number, y: number, w: number, h: number, rx: number, ry: number) {
  return { rect: { x, y, width: w, height: h }, rx, ry };
}

function drawBob(cx: number, cy: number, r: number): ReturnType<typeof Skia.Path.Make> {
  const path = Skia.Path.Make();
  path.addOval({ x: cx - r * 1.1, y: cy - r * 1.05, width: r * 2.2, height: r * 2.1 });
  const sideL = Skia.Path.Make();
  sideL.addRRect(rrect(cx - r * 1.15, cy + r * 0.2, r * 0.55, r * 0.9, r * 0.2, r * 0.2));
  const sideR = Skia.Path.Make();
  sideR.addRRect(rrect(cx + r * 0.6, cy + r * 0.2, r * 0.55, r * 0.9, r * 0.2, r * 0.2));
  path.addPath(sideL);
  path.addPath(sideR);
  return path;
}

function drawPixie(cx: number, cy: number, r: number): ReturnType<typeof Skia.Path.Make> {
  const path = Skia.Path.Make();
  path.addOval({ x: cx - r * 1.08, y: cy - r * 1.1, width: r * 2.16, height: r * 1.8 });
  const bangs = Skia.Path.Make();
  bangs.moveTo(cx - r * 0.8, cy - r * 0.5);
  bangs.quadTo(cx - r * 0.2, cy - r * 0.9, cx + r * 0.6, cy - r * 0.6);
  bangs.quadTo(cx + r * 0.9, cy - r * 0.3, cx + r * 0.7, cy - r * 0.1);
  bangs.lineTo(cx - r * 0.8, cy - r * 0.1);
  bangs.close();
  path.addPath(bangs);
  return path;
}

function drawShortStraight(cx: number, cy: number, r: number): ReturnType<typeof Skia.Path.Make> {
  const path = Skia.Path.Make();
  path.addOval({ x: cx - r * 1.05, y: cy - r * 1.08, width: r * 2.1, height: r * 1.9 });
  const top = Skia.Path.Make();
  top.addOval({ x: cx - r * 0.9, y: cy - r * 1.3, width: r * 1.8, height: r * 0.7 });
  path.addPath(top);
  return path;
}

function drawTexturedShort(cx: number, cy: number, r: number): ReturnType<typeof Skia.Path.Make> {
  const path = Skia.Path.Make();
  path.addOval({ x: cx - r * 1.1, y: cy - r * 1.12, width: r * 2.2, height: r * 1.85 });
  for (let i = 0; i < 5; i++) {
    const angle = -0.8 + i * 0.35;
    const bx = cx + Math.cos(angle) * r * 0.7;
    const by = cy - r * 1.0 + Math.sin(angle) * r * 0.3;
    const spike = Skia.Path.Make();
    spike.moveTo(bx, by);
    spike.lineTo(bx + Math.cos(angle - 0.3) * r * 0.25, by - r * 0.3);
    spike.lineTo(bx + Math.cos(angle + 0.3) * r * 0.25, by - r * 0.3);
    spike.close();
    path.addPath(spike);
  }
  return path;
}

function drawLongStraight(cx: number, cy: number, r: number): ReturnType<typeof Skia.Path.Make> {
  const path = Skia.Path.Make();
  path.addOval({ x: cx - r * 1.08, y: cy - r * 1.05, width: r * 2.16, height: r * 2.1 });
  const leftHair = Skia.Path.Make();
  leftHair.addRRect(rrect(cx - r * 1.2, cy - r * 0.3, r * 0.5, r * 2.2, r * 0.15, r * 0.15));
  const rightHair = Skia.Path.Make();
  rightHair.addRRect(rrect(cx + r * 0.7, cy - r * 0.3, r * 0.5, r * 2.2, r * 0.15, r * 0.15));
  path.addPath(leftHair);
  path.addPath(rightHair);
  return path;
}

function drawLongWavy(cx: number, cy: number, r: number): ReturnType<typeof Skia.Path.Make> {
  const path = Skia.Path.Make();
  path.addOval({ x: cx - r * 1.1, y: cy - r * 1.05, width: r * 2.2, height: r * 2.1 });
  const leftWave = Skia.Path.Make();
  leftWave.moveTo(cx - r * 1.05, cy - r * 0.2);
  leftWave.quadTo(cx - r * 1.3, cy + r * 0.5, cx - r * 1.1, cy + r * 1.2);
  leftWave.quadTo(cx - r * 0.9, cy + r * 1.8, cx - r * 1.0, cy + r * 2.0);
  leftWave.lineTo(cx - r * 0.7, cy + r * 2.0);
  leftWave.quadTo(cx - r * 0.8, cy + r * 1.5, cx - r * 0.9, cy + r * 0.8);
  leftWave.quadTo(cx - r * 1.0, cy + r * 0.2, cx - r * 0.8, cy - r * 0.2);
  leftWave.close();
  const rightWave = Skia.Path.Make();
  rightWave.moveTo(cx + r * 1.05, cy - r * 0.2);
  rightWave.quadTo(cx + r * 1.3, cy + r * 0.5, cx + r * 1.1, cy + r * 1.2);
  rightWave.quadTo(cx + r * 0.9, cy + r * 1.8, cx + r * 1.0, cy + r * 2.0);
  rightWave.lineTo(cx + r * 0.7, cy + r * 2.0);
  rightWave.quadTo(cx + r * 0.8, cy + r * 1.5, cx + r * 0.9, cy + r * 0.8);
  rightWave.quadTo(cx + r * 1.0, cy + r * 0.2, cx + r * 0.8, cy - r * 0.2);
  rightWave.close();
  path.addPath(leftWave);
  path.addPath(rightWave);
  return path;
}

function drawBigWave(cx: number, cy: number, r: number): ReturnType<typeof Skia.Path.Make> {
  const path = Skia.Path.Make();
  path.addOval({ x: cx - r * 1.15, y: cy - r * 1.08, width: r * 2.3, height: r * 2.16 });
  const leftWave = Skia.Path.Make();
  leftWave.moveTo(cx - r * 1.1, cy - r * 0.1);
  leftWave.cubicTo(cx - r * 1.5, cy + r * 0.6, cx - r * 0.9, cy + r * 1.4, cx - r * 1.2, cy + r * 2.2);
  leftWave.lineTo(cx - r * 0.7, cy + r * 2.2);
  leftWave.cubicTo(cx - r * 0.6, cy + r * 1.2, cx - r * 1.0, cy + r * 0.4, cx - r * 0.8, cy - r * 0.1);
  leftWave.close();
  const rightWave = Skia.Path.Make();
  rightWave.moveTo(cx + r * 1.1, cy - r * 0.1);
  rightWave.cubicTo(cx + r * 1.5, cy + r * 0.6, cx + r * 0.9, cy + r * 1.4, cx + r * 1.2, cy + r * 2.2);
  rightWave.lineTo(cx + r * 0.7, cy + r * 2.2);
  rightWave.cubicTo(cx + r * 0.6, cy + r * 1.2, cx + r * 1.0, cy + r * 0.4, cx + r * 0.8, cy - r * 0.1);
  rightWave.close();
  path.addPath(leftWave);
  path.addPath(rightWave);
  return path;
}

function drawLayeredLong(cx: number, cy: number, r: number): ReturnType<typeof Skia.Path.Make> {
  const path = Skia.Path.Make();
  path.addOval({ x: cx - r * 1.1, y: cy - r * 1.05, width: r * 2.2, height: r * 2.1 });
  const layer1 = Skia.Path.Make();
  layer1.addRRect(rrect(cx - r * 1.15, cy - r * 0.1, r * 0.45, r * 1.8, r * 0.12, r * 0.12));
  const layer2 = Skia.Path.Make();
  layer2.addRRect(rrect(cx + r * 0.7, cy - r * 0.1, r * 0.45, r * 1.8, r * 0.12, r * 0.12));
  const layer3 = Skia.Path.Make();
  layer3.addRRect(rrect(cx - r * 0.9, cy + r * 0.3, r * 0.35, r * 1.5, r * 0.1, r * 0.1));
  const layer4 = Skia.Path.Make();
  layer4.addRRect(rrect(cx + r * 0.55, cy + r * 0.3, r * 0.35, r * 1.5, r * 0.1, r * 0.1));
  path.addPath(layer1);
  path.addPath(layer2);
  path.addPath(layer3);
  path.addPath(layer4);
  return path;
}

function drawCurly(cx: number, cy: number, r: number): ReturnType<typeof Skia.Path.Make> {
  const path = Skia.Path.Make();
  path.addOval({ x: cx - r * 1.2, y: cy - r * 1.15, width: r * 2.4, height: r * 2.3 });
  const curls = 8;
  for (let i = 0; i < curls; i++) {
    const angle = (i / curls) * Math.PI * 2 - Math.PI / 2;
    const curlR = r * 0.22;
    const dist = r * 1.05;
    const curlCx = cx + Math.cos(angle) * dist;
    const curlCy = cy + Math.sin(angle) * dist;
    const curl = Skia.Path.Make();
    curl.addCircle(curlCx, curlCy, curlR);
    path.addPath(curl);
  }
  return path;
}

function drawWaterRipple(cx: number, cy: number, r: number): ReturnType<typeof Skia.Path.Make> {
  const path = Skia.Path.Make();
  path.addOval({ x: cx - r * 1.12, y: cy - r * 1.08, width: r * 2.24, height: r * 2.16 });
  const waves = 6;
  for (let i = 0; i < waves; i++) {
    const yOff = cy - r * 0.5 + i * r * 0.35;
    const wave = Skia.Path.Make();
    wave.moveTo(cx - r * 1.0, yOff);
    wave.quadTo(cx - r * 0.5, yOff - r * 0.1, cx, yOff);
    wave.quadTo(cx + r * 0.5, yOff + r * 0.1, cx + r * 1.0, yOff);
    path.addPath(wave);
  }
  return path;
}

function drawSpiralCurl(cx: number, cy: number, r: number): ReturnType<typeof Skia.Path.Make> {
  const path = Skia.Path.Make();
  path.addOval({ x: cx - r * 1.15, y: cy - r * 1.1, width: r * 2.3, height: r * 2.2 });
  const spirals = 6;
  for (let i = 0; i < spirals; i++) {
    const angle = (i / spirals) * Math.PI * 2;
    const dist = r * 1.0;
    const sx = cx + Math.cos(angle) * dist;
    const sy = cy + Math.sin(angle) * dist;
    const spiral = Skia.Path.Make();
    spiral.addCircle(sx, sy, r * 0.18);
    path.addPath(spiral);
  }
  return path;
}

function drawAfro(cx: number, cy: number, r: number): ReturnType<typeof Skia.Path.Make> {
  const path = Skia.Path.Make();
  path.addCircle(cx, cy - r * 0.1, r * 1.4);
  return path;
}

function drawPonytail(cx: number, cy: number, r: number): ReturnType<typeof Skia.Path.Make> {
  const path = Skia.Path.Make();
  path.addOval({ x: cx - r * 1.05, y: cy - r * 1.08, width: r * 2.1, height: r * 1.9 });
  const tail = Skia.Path.Make();
  tail.moveTo(cx, cy - r * 1.0);
  tail.quadTo(cx + r * 0.8, cy - r * 1.5, cx + r * 0.6, cy - r * 2.2);
  tail.quadTo(cx + r * 0.4, cy - r * 2.8, cx + r * 0.2, cy - r * 2.5);
  tail.quadTo(cx + r * 0.5, cy - r * 1.8, cx + r * 0.3, cy - r * 1.2);
  tail.lineTo(cx - r * 0.1, cy - r * 1.0);
  tail.close();
  path.addPath(tail);
  return path;
}

function drawTwinTails(cx: number, cy: number, r: number): ReturnType<typeof Skia.Path.Make> {
  const path = Skia.Path.Make();
  path.addOval({ x: cx - r * 1.05, y: cy - r * 1.08, width: r * 2.1, height: r * 1.9 });
  const leftTail = Skia.Path.Make();
  leftTail.moveTo(cx - r * 0.7, cy - r * 0.8);
  leftTail.quadTo(cx - r * 1.5, cy - r * 1.3, cx - r * 1.3, cy - r * 2.0);
  leftTail.quadTo(cx - r * 1.1, cy - r * 2.5, cx - r * 0.9, cy - r * 2.0);
  leftTail.quadTo(cx - r * 1.0, cy - r * 1.4, cx - r * 0.5, cy - r * 0.9);
  leftTail.close();
  const rightTail = Skia.Path.Make();
  rightTail.moveTo(cx + r * 0.7, cy - r * 0.8);
  rightTail.quadTo(cx + r * 1.5, cy - r * 1.3, cx + r * 1.3, cy - r * 2.0);
  rightTail.quadTo(cx + r * 1.1, cy - r * 2.5, cx + r * 0.9, cy - r * 2.0);
  rightTail.quadTo(cx + r * 1.0, cy - r * 1.4, cx + r * 0.5, cy - r * 0.9);
  rightTail.close();
  path.addPath(leftTail);
  path.addPath(rightTail);
  return path;
}

function drawBun(cx: number, cy: number, r: number): ReturnType<typeof Skia.Path.Make> {
  const path = Skia.Path.Make();
  path.addOval({ x: cx - r * 1.05, y: cy - r * 1.08, width: r * 2.1, height: r * 1.9 });
  const bun = Skia.Path.Make();
  bun.addCircle(cx, cy - r * 1.3, r * 0.4);
  path.addPath(bun);
  return path;
}

function drawTwinBuns(cx: number, cy: number, r: number): ReturnType<typeof Skia.Path.Make> {
  const path = Skia.Path.Make();
  path.addOval({ x: cx - r * 1.05, y: cy - r * 1.08, width: r * 2.1, height: r * 1.9 });
  const leftBun = Skia.Path.Make();
  leftBun.addCircle(cx - r * 0.65, cy - r * 1.2, r * 0.35);
  const rightBun = Skia.Path.Make();
  rightBun.addCircle(cx + r * 0.65, cy - r * 1.2, r * 0.35);
  path.addPath(leftBun);
  path.addPath(rightBun);
  return path;
}

function drawBraid(cx: number, cy: number, r: number): ReturnType<typeof Skia.Path.Make> {
  const path = Skia.Path.Make();
  path.addOval({ x: cx - r * 1.05, y: cy - r * 1.08, width: r * 2.1, height: r * 1.9 });
  const braid = Skia.Path.Make();
  braid.moveTo(cx + r * 0.2, cy - r * 0.8);
  const segments = 5;
  for (let i = 0; i < segments; i++) {
    const y1 = cy - r * 0.8 + (i + 0.5) * r * 0.5;
    const y2 = cy - r * 0.8 + (i + 1) * r * 0.5;
    const xOff = (i % 2 === 0 ? 1 : -1) * r * 0.15;
    braid.quadTo(cx + r * 0.5 + xOff, y1, cx + r * 0.2, y2);
  }
  braid.lineTo(cx - r * 0.1, cy + r * 1.7);
  braid.lineTo(cx + r * 0.5, cy + r * 1.7);
  for (let i = segments - 1; i >= 0; i--) {
    const y1 = cy - r * 0.8 + (i + 0.5) * r * 0.5;
    const y2 = cy - r * 0.8 + i * r * 0.5;
    const xOff = (i % 2 === 0 ? -1 : 1) * r * 0.15;
    braid.quadTo(cx - r * 0.1 + xOff, y1, cx + r * 0.2, y2);
  }
  braid.close();
  path.addPath(braid);
  return path;
}

function drawTwinBraids(cx: number, cy: number, r: number): ReturnType<typeof Skia.Path.Make> {
  const path = Skia.Path.Make();
  path.addOval({ x: cx - r * 1.05, y: cy - r * 1.08, width: r * 2.1, height: r * 1.9 });
  const makeBraid = (startX: number) => {
    const braid = Skia.Path.Make();
    braid.moveTo(startX, cy - r * 0.5);
    const segments = 4;
    for (let i = 0; i < segments; i++) {
      const y1 = cy - r * 0.5 + (i + 0.5) * r * 0.45;
      const y2 = cy - r * 0.5 + (i + 1) * r * 0.45;
      const xOff = (i % 2 === 0 ? 1 : -1) * r * 0.12;
      braid.quadTo(startX + xOff, y1, startX, y2);
    }
    braid.lineTo(startX + r * 0.12, cy + r * 1.3);
    braid.lineTo(startX - r * 0.12, cy + r * 1.3);
    for (let i = segments - 1; i >= 0; i--) {
      const y2 = cy - r * 0.5 + i * r * 0.45;
      braid.lineTo(startX, y2);
    }
    braid.close();
    return braid;
  };
  path.addPath(makeBraid(cx - r * 0.85));
  path.addPath(makeBraid(cx + r * 0.85));
  return path;
}

function drawBuzzCut(cx: number, cy: number, r: number): ReturnType<typeof Skia.Path.Make> {
  const path = Skia.Path.Make();
  path.addOval({ x: cx - r * 1.02, y: cy - r * 1.06, width: r * 2.04, height: r * 1.6 });
  return path;
}

function drawMohawk(cx: number, cy: number, r: number): ReturnType<typeof Skia.Path.Make> {
  const path = Skia.Path.Make();
  path.addOval({ x: cx - r * 1.02, y: cy - r * 1.06, width: r * 2.04, height: r * 1.6 });
  const crest = Skia.Path.Make();
  crest.moveTo(cx - r * 0.15, cy - r * 0.9);
  crest.quadTo(cx - r * 0.1, cy - r * 1.8, cx, cy - r * 2.0);
  crest.quadTo(cx + r * 0.1, cy - r * 1.8, cx + r * 0.15, cy - r * 0.9);
  crest.close();
  path.addPath(crest);
  return path;
}

const HAIR_DRAWERS: Record<HairStyle, (cx: number, cy: number, r: number) => ReturnType<typeof Skia.Path.Make>> = {
  bob: drawBob,
  pixie: drawPixie,
  shortStraight: drawShortStraight,
  texturedShort: drawTexturedShort,
  longStraight: drawLongStraight,
  longWavy: drawLongWavy,
  bigWave: drawBigWave,
  layeredLong: drawLayeredLong,
  curly: drawCurly,
  waterRipple: drawWaterRipple,
  spiralCurl: drawSpiralCurl,
  afro: drawAfro,
  ponytail: drawPonytail,
  twinTails: drawTwinTails,
  bun: drawBun,
  twinBuns: drawTwinBuns,
  braid: drawBraid,
  twinBraids: drawTwinBraids,
  buzzCut: drawBuzzCut,
  mohawk: drawMohawk,
};

export function drawHair(ctx: DrawingContext): HairDrawResult {
  const { cx, cy, headRadius, params } = ctx;
  const drawer = HAIR_DRAWERS[params.hairStyle];
  const hairPath = drawer(cx, cy, headRadius);

  return { hairPath };
}
