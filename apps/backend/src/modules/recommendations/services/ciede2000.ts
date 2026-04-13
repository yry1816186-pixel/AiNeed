export interface LabColor {
  L: number;
  a: number;
  b: number;
}

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

function deg2rad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function rad2deg(rad: number): number {
  return (rad * 180) / Math.PI;
}

export function rgbToLab(rgb: RGBColor): LabColor {
  let r = rgb.r / 255;
  let g = rgb.g / 255;
  let b = rgb.b / 255;

  r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  let X = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
  let Y = (r * 0.2126729 + g * 0.7151522 + b * 0.072175) / 1.0;
  let Z = (r * 0.0193339 + g * 0.119192 + b * 0.9503041) / 1.08883;

  X = X > 0.008856 ? Math.pow(X, 1 / 3) : 7.787 * X + 16 / 116;
  Y = Y > 0.008856 ? Math.pow(Y, 1 / 3) : 7.787 * Y + 16 / 116;
  Z = Z > 0.008856 ? Math.pow(Z, 1 / 3) : 7.787 * Z + 16 / 116;

  return {
    L: 116 * Y - 16,
    a: 500 * (X - Y),
    b: 200 * (Y - Z),
  };
}

export function ciede2000(lab1: LabColor, lab2: LabColor): number {
  const L1 = lab1.L;
  const a1 = lab1.a;
  const b1 = lab1.b;
  const L2 = lab2.L;
  const a2 = lab2.a;
  const b2 = lab2.b;

  const C1ab = Math.sqrt(a1 * a1 + b1 * b1);
  const C2ab = Math.sqrt(a2 * a2 + b2 * b2);
  const Cab = (C1ab + C2ab) / 2;

  const Cab7 = Math.pow(Cab, 7);
  const G = 0.5 * (1 - Math.sqrt(Cab7 / (Cab7 + Math.pow(25, 7))));

  const a1p = a1 * (1 + G);
  const a2p = a2 * (1 + G);

  const C1p = Math.sqrt(a1p * a1p + b1 * b1);
  const C2p = Math.sqrt(a2p * a2p + b2 * b2);

  const h1p =
    C1p === 0 ? 0 : (rad2deg(Math.atan2(b1, a1p)) + 360) % 360;
  const h2p =
    C2p === 0 ? 0 : (rad2deg(Math.atan2(b2, a2p)) + 360) % 360;

  const dLp = L2 - L1;
  const dCp = C2p - C1p;

  let dhp: number;
  if (C1p * C2p === 0) {
    dhp = 0;
  } else if (Math.abs(h2p - h1p) <= 180) {
    dhp = h2p - h1p;
  } else if (h2p - h1p > 180) {
    dhp = h2p - h1p - 360;
  } else {
    dhp = h2p - h1p + 360;
  }

  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(deg2rad(dhp / 2));

  const Lp = (L1 + L2) / 2;
  const Cp = (C1p + C2p) / 2;

  let hp: number;
  if (C1p * C2p === 0) {
    hp = h1p + h2p;
  } else if (Math.abs(h1p - h2p) <= 180) {
    hp = (h1p + h2p) / 2;
  } else if (h1p + h2p < 360) {
    hp = (h1p + h2p + 360) / 2;
  } else {
    hp = (h1p + h2p - 360) / 2;
  }

  const T =
    1 -
    0.17 * Math.cos(deg2rad(hp - 30)) +
    0.24 * Math.cos(deg2rad(2 * hp)) +
    0.32 * Math.cos(deg2rad(3 * hp + 6)) -
    0.2 * Math.cos(deg2rad(4 * hp - 63));

  const Lp50 = Math.pow(Lp - 50, 2);
  const SL = 1 + (0.015 * Lp50) / Math.sqrt(20 + Lp50);
  const SC = 1 + 0.045 * Cp;
  const SH = 1 + 0.015 * Cp * T;

  const Cp7 = Math.pow(Cp, 7);
  const RT_d = Math.pow(30, 7);
  const RC = 2 * Math.sqrt(Cp7 / (Cp7 + Math.pow(25, 7)));
  const dtheta = 30 * Math.exp(-Math.pow((hp - 275) / 25, 2));
  const RT = -Math.sin(deg2rad(2 * dtheta)) * RC;

  const kL = 1;
  const kC = 1;
  const kH = 1;

  const term1 = dLp / (kL * SL);
  const term2 = dCp / (kC * SC);
  const term3 = dHp / (kH * SH);

  return Math.sqrt(
    term1 * term1 + term2 * term2 + term3 * term3 + RT * term2 * term3,
  );
}

export function colorSimilarity(rgb1: RGBColor, rgb2: RGBColor): number {
  const lab1 = rgbToLab(rgb1);
  const lab2 = rgbToLab(rgb2);
  const delta = ciede2000(lab1, lab2);
  return Math.max(0, 1 - delta / 100);
}

export function hexToRgb(hex: string): RGBColor {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

export function findHarmoniousColors(
  baseHex: string,
  candidates: Array<{ id: string; hex: string }>,
  maxDelta: number = 30,
): Array<{ id: string; hex: string; delta: number }> {
  const baseLab = rgbToLab(hexToRgb(baseHex));

  return candidates
    .map((c) => ({
      id: c.id,
      hex: c.hex,
      delta: ciede2000(baseLab, rgbToLab(hexToRgb(c.hex))),
    }))
    .filter((c) => c.delta <= maxDelta)
    .sort((a, b) => a.delta - b.delta);
}
