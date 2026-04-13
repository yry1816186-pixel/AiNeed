export interface CursorData {
  sortField: string;
  lastValue: string | number;
  direction: "asc" | "desc";
}

export class CursorDecodeError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "CursorDecodeError";
    Object.setPrototypeOf(this, CursorDecodeError.prototype);
  }
}

export function encodeCursor(data: CursorData): string {
  const json = JSON.stringify(data);
  const base64 = Buffer.from(json, "utf-8").toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeCursor(cursor: string): CursorData {
  try {
    let base64 = cursor.replace(/-/g, "+").replace(/_/g, "/");
    const padding = base64.length % 4;
    if (padding === 2) {
      base64 += "==";
    } else if (padding === 3) {
      base64 += "=";
    }
    const json = Buffer.from(base64, "base64").toString("utf-8");
    const data = JSON.parse(json) as CursorData;
    if (
      typeof data.sortField !== "string" ||
      (typeof data.lastValue !== "string" && typeof data.lastValue !== "number") ||
      (data.direction !== "asc" && data.direction !== "desc")
    ) {
      throw new CursorDecodeError("Invalid cursor data structure");
    }
    return data;
  } catch (error) {
    if (error instanceof CursorDecodeError) {
      throw error;
    }
    throw new CursorDecodeError("Failed to decode cursor", error);
  }
}

export function isValidCursor(cursor: string): boolean {
  try {
    decodeCursor(cursor);
    return true;
  } catch {
    return false;
  }
}
