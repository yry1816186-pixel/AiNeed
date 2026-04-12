import { Skia } from '@shopify/react-native-skia';
import type { ClothingMap, ClothingType, DrawingContext } from '../types';

interface ClothingDrawResult {
  topPath: ReturnType<typeof Skia.Path.Make> | null;
  topColor: string | null;
  bottomPath: ReturnType<typeof Skia.Path.Make> | null;
  bottomColor: string | null;
  shoesPath: ReturnType<typeof Skia.Path.Make> | null;
  shoesColor: string | null;
  outerwearPath: ReturnType<typeof Skia.Path.Make> | null;
  outerwearColor: string | null;
}

function rrect(x: number, y: number, w: number, h: number, rx: number, ry: number) {
  return { rect: { x, y, width: w, height: h }, rx, ry };
}

function drawTshirt(cx: number, bodyTopY: number, bodyWidth: number, headRadius: number): ReturnType<typeof Skia.Path.Make> {
  const path = Skia.Path.Make();
  const w = bodyWidth * 0.55;
  const h = headRadius * 1.1;
  path.addRRect(rrect(cx - w, bodyTopY, w * 2, h, headRadius * 0.15, headRadius * 0.15));
  return path;
}

function drawHoodie(cx: number, bodyTopY: number, bodyWidth: number, headRadius: number): ReturnType<typeof Skia.Path.Make> {
  const path = Skia.Path.Make();
  const w = bodyWidth * 0.6;
  const h = headRadius * 1.3;
  path.addRRect(rrect(cx - w, bodyTopY - headRadius * 0.05, w * 2, h, headRadius * 0.18, headRadius * 0.18));
  const hood = Skia.Path.Make();
  hood.moveTo(cx - headRadius * 0.4, bodyTopY);
  hood.quadTo(cx, bodyTopY - headRadius * 0.3, cx + headRadius * 0.4, bodyTopY);
  hood.close();
  path.addPath(hood);
  return path;
}

function drawJacket(cx: number, bodyTopY: number, bodyWidth: number, headRadius: number): ReturnType<typeof Skia.Path.Make> {
  const path = Skia.Path.Make();
  const w = bodyWidth * 0.65;
  const h = headRadius * 1.2;
  path.addRRect(rrect(cx - w, bodyTopY - headRadius * 0.02, w * 2, h, headRadius * 0.12, headRadius * 0.12));
  const collar = Skia.Path.Make();
  collar.moveTo(cx - headRadius * 0.35, bodyTopY);
  collar.lineTo(cx - headRadius * 0.1, bodyTopY - headRadius * 0.15);
  collar.lineTo(cx + headRadius * 0.1, bodyTopY - headRadius * 0.15);
  collar.lineTo(cx + headRadius * 0.35, bodyTopY);
  collar.close();
  path.addPath(collar);
  return path;
}

function drawDress(cx: number, bodyTopY: number, bodyWidth: number, headRadius: number): ReturnType<typeof Skia.Path.Make> {
  const path = Skia.Path.Make();
  const topW = bodyWidth * 0.5;
  const bottomW = bodyWidth * 0.8;
  const h = headRadius * 2.0;
  path.moveTo(cx - topW, bodyTopY);
  path.lineTo(cx + topW, bodyTopY);
  path.lineTo(cx + bottomW, bodyTopY + h);
  path.lineTo(cx - bottomW, bodyTopY + h);
  path.close();
  return path;
}

function drawJeans(cx: number, legTopY: number, headRadius: number): ReturnType<typeof Skia.Path.Make> {
  const path = Skia.Path.Make();
  const legW = headRadius * 0.4;
  const legH = headRadius * 0.95;
  const gap = headRadius * 0.06;
  path.addRRect(rrect(cx - legW - gap / 2, legTopY, legW, legH, headRadius * 0.08, headRadius * 0.08));
  path.addRRect(rrect(cx + gap / 2, legTopY, legW, legH, headRadius * 0.08, headRadius * 0.08));
  return path;
}

function drawSkirt(cx: number, legTopY: number, headRadius: number): ReturnType<typeof Skia.Path.Make> {
  const path = Skia.Path.Make();
  const topW = headRadius * 0.5;
  const bottomW = headRadius * 0.9;
  const h = headRadius * 0.8;
  path.moveTo(cx - topW, legTopY);
  path.lineTo(cx + topW, legTopY);
  path.quadTo(cx + bottomW + headRadius * 0.1, legTopY + h * 0.5, cx + bottomW, legTopY + h);
  path.lineTo(cx - bottomW, legTopY + h);
  path.quadTo(cx - bottomW - headRadius * 0.1, legTopY + h * 0.5, cx - topW, legTopY);
  path.close();
  return path;
}

function drawShorts(cx: number, legTopY: number, headRadius: number): ReturnType<typeof Skia.Path.Make> {
  const path = Skia.Path.Make();
  const legW = headRadius * 0.42;
  const legH = headRadius * 0.45;
  const gap = headRadius * 0.06;
  path.addRRect(rrect(cx - legW - gap / 2, legTopY, legW, legH, headRadius * 0.1, headRadius * 0.1));
  path.addRRect(rrect(cx + gap / 2, legTopY, legW, legH, headRadius * 0.1, headRadius * 0.1));
  return path;
}

function drawSneakers(cx: number, footY: number, headRadius: number): ReturnType<typeof Skia.Path.Make> {
  const path = Skia.Path.Make();
  const shoeW = headRadius * 0.38;
  const shoeH = headRadius * 0.18;
  const gap = headRadius * 0.06;
  path.addRRect(rrect(cx - shoeW - gap / 2, footY, shoeW + headRadius * 0.08, shoeH, headRadius * 0.06, headRadius * 0.06));
  path.addRRect(rrect(cx + gap / 2 - headRadius * 0.08, footY, shoeW + headRadius * 0.08, shoeH, headRadius * 0.06, headRadius * 0.06));
  return path;
}

function drawBoots(cx: number, footY: number, headRadius: number): ReturnType<typeof Skia.Path.Make> {
  const path = Skia.Path.Make();
  const bootW = headRadius * 0.38;
  const bootH = headRadius * 0.45;
  const gap = headRadius * 0.06;
  path.addRRect(rrect(cx - bootW - gap / 2, footY - bootH + headRadius * 0.18, bootW + headRadius * 0.06, bootH, headRadius * 0.08, headRadius * 0.08));
  path.addRRect(rrect(cx + gap / 2 - headRadius * 0.06, footY - bootH + headRadius * 0.18, bootW + headRadius * 0.06, bootH, headRadius * 0.08, headRadius * 0.08));
  return path;
}

function drawSandals(cx: number, footY: number, headRadius: number): ReturnType<typeof Skia.Path.Make> {
  const path = Skia.Path.Make();
  const sandalW = headRadius * 0.35;
  const sandalH = headRadius * 0.1;
  const gap = headRadius * 0.06;
  path.addRRect(rrect(cx - sandalW - gap / 2, footY, sandalW, sandalH, headRadius * 0.04, headRadius * 0.04));
  path.addRRect(rrect(cx + gap / 2, footY, sandalW, sandalH, headRadius * 0.04, headRadius * 0.04));
  return path;
}

function drawHeels(cx: number, footY: number, headRadius: number): ReturnType<typeof Skia.Path.Make> {
  const path = Skia.Path.Make();
  const heelW = headRadius * 0.3;
  const heelH = headRadius * 0.2;
  const gap = headRadius * 0.06;
  path.moveTo(cx - heelW - gap / 2, footY);
  path.lineTo(cx - gap / 2, footY);
  path.lineTo(cx - gap / 2, footY + heelH);
  path.lineTo(cx - heelW - gap / 2, footY + heelH * 0.3);
  path.close();
  path.moveTo(cx + gap / 2, footY);
  path.lineTo(cx + heelW + gap / 2, footY);
  path.lineTo(cx + heelW + gap / 2, footY + heelH * 0.3);
  path.lineTo(cx + gap / 2, footY + heelH);
  path.close();
  return path;
}

function drawCoat(cx: number, bodyTopY: number, bodyWidth: number, headRadius: number): ReturnType<typeof Skia.Path.Make> {
  const path = Skia.Path.Make();
  const w = bodyWidth * 0.7;
  const h = headRadius * 1.8;
  path.addRRect(rrect(cx - w, bodyTopY - headRadius * 0.05, w * 2, h, headRadius * 0.14, headRadius * 0.14));
  const lapel = Skia.Path.Make();
  lapel.moveTo(cx - headRadius * 0.15, bodyTopY);
  lapel.lineTo(cx, bodyTopY + headRadius * 0.4);
  lapel.lineTo(cx + headRadius * 0.15, bodyTopY);
  lapel.close();
  path.addPath(lapel);
  return path;
}

type TopType = 'tshirt' | 'hoodie' | 'jacket' | 'dress';
type BottomType = 'jeans' | 'skirt' | 'shorts';
type ShoeType = 'sneakers' | 'boots' | 'sandals' | 'heels';
type OuterwearType = 'coat' | 'jacket';

const TOP_DRAWERS: Record<TopType, (cx: number, bodyTopY: number, bodyWidth: number, headRadius: number) => ReturnType<typeof Skia.Path.Make>> = {
  tshirt: drawTshirt,
  hoodie: drawHoodie,
  jacket: drawJacket,
  dress: drawDress,
};

const BOTTOM_DRAWERS: Record<BottomType, (cx: number, legTopY: number, headRadius: number) => ReturnType<typeof Skia.Path.Make>> = {
  jeans: drawJeans,
  skirt: drawSkirt,
  shorts: drawShorts,
};

const SHOE_DRAWERS: Record<ShoeType, (cx: number, footY: number, headRadius: number) => ReturnType<typeof Skia.Path.Make>> = {
  sneakers: drawSneakers,
  boots: drawBoots,
  sandals: drawSandals,
  heels: drawHeels,
};

const OUTERWEAR_DRAWERS: Record<OuterwearType, (cx: number, bodyTopY: number, bodyWidth: number, headRadius: number) => ReturnType<typeof Skia.Path.Make>> = {
  coat: drawCoat,
  jacket: drawJacket,
};

function isTopType(type: ClothingType): type is TopType {
  return type in TOP_DRAWERS;
}

function isBottomType(type: ClothingType): type is BottomType {
  return type in BOTTOM_DRAWERS;
}

function isShoeType(type: ClothingType): type is ShoeType {
  return type in SHOE_DRAWERS;
}

function isOuterwearType(type: ClothingType): type is OuterwearType {
  return type in OUTERWEAR_DRAWERS;
}

export function drawClothingSlots(ctx: DrawingContext): ClothingDrawResult {
  const { cx, cy, headRadius, clothingMap, transform } = ctx;
  const bodyTopY = cy + headRadius * 1.05 + transform.bodyTranslateY;
  const bodyWidth = headRadius * 1.4;
  const bodyHeight = headRadius * 1.8;
  const legTopY = bodyTopY + bodyHeight - headRadius * 0.1;
  const legHeight = headRadius * 0.9;
  const footY = legTopY + legHeight - headRadius * 0.05;

  const top = clothingMap.top;
  const bottom = clothingMap.bottom;
  const shoes = clothingMap.shoes;
  const outerwear = clothingMap.outerwear;

  let topPath: ReturnType<typeof Skia.Path.Make> | null = null;
  let topColor: string | null = null;
  if (top && isTopType(top.type)) {
    topPath = TOP_DRAWERS[top.type](cx, bodyTopY, bodyWidth, headRadius);
    topColor = top.color;
  }

  let bottomPath: ReturnType<typeof Skia.Path.Make> | null = null;
  let bottomColor: string | null = null;
  if (bottom && isBottomType(bottom.type)) {
    bottomPath = BOTTOM_DRAWERS[bottom.type](cx, legTopY, headRadius);
    bottomColor = bottom.color;
  }

  let shoesPath: ReturnType<typeof Skia.Path.Make> | null = null;
  let shoesColor: string | null = null;
  if (shoes && isShoeType(shoes.type)) {
    shoesPath = SHOE_DRAWERS[shoes.type](cx, footY, headRadius);
    shoesColor = shoes.color;
  }

  let outerwearPath: ReturnType<typeof Skia.Path.Make> | null = null;
  let outerwearColor: string | null = null;
  if (outerwear && isOuterwearType(outerwear.type)) {
    outerwearPath = OUTERWEAR_DRAWERS[outerwear.type](cx, bodyTopY, bodyWidth, headRadius);
    outerwearColor = outerwear.color;
  }

  return { topPath, topColor, bottomPath, bottomColor, shoesPath, shoesColor, outerwearPath, outerwearColor };
}
