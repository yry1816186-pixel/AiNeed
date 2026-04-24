/* eslint-disable @typescript-eslint/require-await */
export const SaveFormat = {
  JPEG: "jpeg",
  PNG: "png",
  WEBP: "webp",
} as const;

export async function manipulateAsync(
  uri: string,
  _actions: { resize?: { width?: number; height?: number } }[],
  _options?: { compress?: number; format?: string; base64?: boolean }
): Promise<{ uri: string; width: number; height: number; base64?: string }> {
  return { uri, width: 0, height: 0 };
}
