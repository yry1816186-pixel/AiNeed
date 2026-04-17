declare module 'expo-image-manipulator' {
  export enum SaveFormat {
    JPEG = 'jpeg',
    PNG = 'png',
    WEBP = 'webp',
  }

  export interface Action {
    resize?: {
      width?: number;
      height?: number;
    };
    rotate?: number;
    flip?: {
      vertical?: boolean;
      horizontal?: boolean;
    };
    crop?: {
      originX: number;
      originY: number;
      width: number;
      height: number;
    };
  }

  export interface ImageResult {
    uri: string;
    width: number;
    height: number;
    base64?: string;
  }

  export function manipulateAsync(
    uri: string,
    actions?: Action[],
    saveOptions?: {
      base64?: boolean;
      compress?: number;
      format?: SaveFormat;
    }
  ): Promise<ImageResult>;
}
