export interface LabColor {
  L: number;
  a: number;
  b: number;
}

const D65_XN = 0.95047;
const D65_YN = 1.0;
const D65_ZN = 1.08883;

function linearize(c: number): number {
  return c > 0.04045 ? ((c + 0.055) / 1.055) ** 2.4 : c / 12.92;
}

export function rgb_to_lab(r: number, g: number, b: number): LabColor {
  const rn = r / 255.0;
  const gn = g / 255.0;
  const bn = b / 255.0;

  const rl = linearize(rn);
  const gl = linearize(gn);
  const bl = linearize(bn);

  const x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / D65_XN;
  const y = (rl * 0.2126729 + gl * 0.7151522 + bl * 0.072175) / D65_YN;
  const z = (rl * 0.0193339 + gl * 0.119192 + bl * 0.9503041) / D65_ZN;

  const delta = 6.0 / 29.0;
  const delta3 = delta ** 3;

  function f(t: number): number {
    return t > delta3 ? t ** (1.0 / 3.0) : t / (3.0 * delta * delta) + 4.0 / 29.0;
  }

  const fx = f(x);
  const fy = f(y);
  const fz = f(z);

  return {
    L: 116.0 * fy - 16.0,
    a: 500.0 * (fx - fy),
    b: 200.0 * (fy - fz),
  };
}

export function lab_to_rgb(L: number, a: number, b: number): { r: number; g: number; b: number } {
  const delta = 6.0 / 29.0;
  const fy = (L + 16.0) / 116.0;
  const fx = a / 500.0 + fy;
  const fz = fy - b / 200.0;

  function invF(t: number): number {
    return t > delta ? t ** 3 : 3.0 * delta * delta * (t - 4.0 / 29.0);
  }

  const xn = invF(fx) * D65_XN;
  const yn = invF(fy) * D65_YN;
  const zn = invF(fz) * D65_ZN;

  const rl = 3.2404542 * xn - 1.5371385 * yn - 0.4985314 * zn;
  const gl = -0.969266 * xn + 1.8760108 * yn + 0.041556 * zn;
  const bl = 0.0556434 * xn - 0.2040259 * yn + 1.0572252 * zn;

  function gamma(c: number): number {
    c = Math.max(0.0, c);
    return c > 0.0031308 ? 1.055 * c ** (1.0 / 2.4) - 0.055 : 12.92 * c;
  }

  return {
    r: Math.min(255, Math.max(0, Math.round(gamma(rl) * 255))),
    g: Math.min(255, Math.max(0, Math.round(gamma(gl) * 255))),
    b: Math.min(255, Math.max(0, Math.round(gamma(bl) * 255))),
  };
}

export function hex_to_lab(hexValue: string): LabColor {
  const hex = hexValue.replace(/^#/, "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return rgb_to_lab(r, g, b);
}

export function lab_to_hex(lab: LabColor): string {
  const { r, g, b } = lab_to_rgb(lab.L, lab.a, lab.b);
  const toHex = (v: number) => v.toString(16).padStart(2, "0").toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function delta_e_ciede2000(
  lab1: LabColor,
  lab2: LabColor,
  kl: number = 1.0,
  kc: number = 1.0,
  kh: number = 1.0
): number {
  const l1 = lab1.L;
  const a1 = lab1.a;
  const b1 = lab1.b;
  const l2 = lab2.L;
  const a2 = lab2.a;
  const b2 = lab2.b;

  const c1 = Math.sqrt(a1 ** 2 + b1 ** 2);
  const c2 = Math.sqrt(a2 ** 2 + b2 ** 2);
  const cAvg = (c1 + c2) / 2.0;

  const cAvg7 = cAvg ** 7;
  const g = 0.5 * (1.0 - Math.sqrt(cAvg7 / (cAvg7 + 25.0 ** 7)));

  const a1p = a1 * (1.0 + g);
  const a2p = a2 * (1.0 + g);

  const c1p = Math.sqrt(a1p ** 2 + b1 ** 2);
  const c2p = Math.sqrt(a2p ** 2 + b2 ** 2);

  const h1p = ((Math.atan2(b1, a1p) * 180.0) / Math.PI + 360.0) % 360.0;
  const h2p = ((Math.atan2(b2, a2p) * 180.0) / Math.PI + 360.0) % 360.0;

  const dL = l2 - l1;
  const dCp = c2p - c1p;

  let dhp: number;
  if (c1p * c2p === 0) {
    dhp = 0.0;
  } else if (Math.abs(h2p - h1p) <= 180.0) {
    dhp = h2p - h1p;
  } else if (h2p - h1p > 180.0) {
    dhp = h2p - h1p - 360.0;
  } else {
    dhp = h2p - h1p + 360.0;
  }

  const dHp = 2.0 * Math.sqrt(c1p * c2p) * Math.sin(((dhp / 2.0) * Math.PI) / 180.0);

  const LpAvg = (l1 + l2) / 2.0;
  const CpAvg = (c1p + c2p) / 2.0;

  let HpAvg: number;
  if (c1p * c2p === 0) {
    HpAvg = h1p + h2p;
  } else if (Math.abs(h1p - h2p) <= 180.0) {
    HpAvg = (h1p + h2p) / 2.0;
  } else if (h1p + h2p < 360.0) {
    HpAvg = (h1p + h2p + 360.0) / 2.0;
  } else {
    HpAvg = (h1p + h2p - 360.0) / 2.0;
  }

  const T =
    1.0 -
    0.17 * Math.cos(((HpAvg - 30.0) * Math.PI) / 180.0) +
    0.24 * Math.cos((2.0 * HpAvg * Math.PI) / 180.0) +
    0.32 * Math.cos(((3.0 * HpAvg + 6.0) * Math.PI) / 180.0) -
    0.2 * Math.cos(((4.0 * HpAvg - 63.0) * Math.PI) / 180.0);

  const SL = 1.0 + (0.015 * (LpAvg - 50.0) ** 2) / Math.sqrt(20.0 + (LpAvg - 50.0) ** 2);
  const SC = 1.0 + 0.045 * CpAvg;
  const SH = 1.0 + 0.015 * CpAvg * T;

  const CpAvg7 = CpAvg ** 7;
  const RT =
    -Math.sin(2.0 * (30.0 * Math.exp(-(((HpAvg - 275.0) / 25.0) ** 2))) * (Math.PI / 180.0)) *
    2.0 *
    Math.sqrt(CpAvg7 / (CpAvg7 + 25.0 ** 7));

  const term1 = dL / (kl * SL);
  const term2 = dCp / (kc * SC);
  const term3 = dHp / (kh * SH);

  return Math.sqrt(term1 ** 2 + term2 ** 2 + term3 ** 2 + RT * term2 * term3);
}

export function compute_ita(lStar: number, bStar: number): number {
  if (Math.abs(bStar) < 1e-10) {
    return lStar > 50 ? 90.0 : -90.0;
  }
  return (Math.atan((lStar - 50.0) / bStar) * 180.0) / Math.PI;
}

export function compute_chroma(aStar: number, bStar: number): number {
  return Math.sqrt(aStar ** 2 + bStar ** 2);
}

export function is_skin_pixel_cielab(r: number, g: number, b: number): boolean {
  const lab = rgb_to_lab(r, g, b);
  if (lab.L < 15 || lab.L > 95) return false;
  if (lab.a < -5 || lab.a > 25) return false;
  if (lab.b < 2 || lab.b > 40) return false;
  return true;
}
