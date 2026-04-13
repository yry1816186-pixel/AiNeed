declare module "canvas" {
  export class Canvas {
    width: number;
    height: number;
    getContext(contextId: string): CanvasRenderingContext2D;
    toBuffer(mime?: string): Buffer;
    toDataURL(mime?: string): string;
  }

  export class Image {
    src: string | Buffer;
    onload: (() => void) | null;
    onerror: ((err: Error) => void) | null;
  }

  export function createCanvas(width: number, height: number): Canvas;
  export function registerFont(src: string, fontFace: { family: string; weight?: string; style?: string }): void;

  export interface CanvasRenderingContext2D {
    fillStyle: string | CanvasGradient | CanvasPattern;
    strokeStyle: string | CanvasGradient | CanvasPattern;
    font: string;
    textAlign: "left" | "right" | "center" | "start" | "end";
    textBaseline: "top" | "hanging" | "middle" | "alphabetic" | "ideographic" | "bottom";
    lineWidth: number;
    fillRect(x: number, y: number, width: number, height: number): void;
    fillText(text: string, x: number, y: number, maxWidth?: number): void;
    strokeText(text: string, x: number, y: number, maxWidth?: number): void;
    measureText(text: string): TextMetrics;
    beginPath(): void;
    closePath(): void;
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
    arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void;
    arcTo(x1: number, y1: number, x2: number, y2: number, radius: number): void;
    rect(x: number, y: number, width: number, height: number): void;
    fill(): void;
    stroke(): void;
    drawImage(image: Canvas | Image, dx: number, dy: number, dw?: number, dh?: number): void;
    save(): void;
    restore(): void;
    clip(): void;
    scale(x: number, y: number): void;
    rotate(angle: number): void;
    translate(x: number, y: number): void;
    createLinearGradient(x0: number, y0: number, x1: number, y1: number): CanvasGradient;
    createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number): CanvasGradient;
  }

  export interface TextMetrics {
    width: number;
  }
}
