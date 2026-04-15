import {
  launchImageLibrary,
  type ImagePickerResponse,
  type ImageLibraryOptions,
} from "react-native-image-picker";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_DIMENSION = 4096;

const SECURE_PICKER_OPTIONS: ImageLibraryOptions = {
  mediaType: "photo",
  quality: 0.8,
  includeBase64: false,
  selectionLimit: 1,
};

export interface SecureImagePickerResult {
  uri: string;
  fileName?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  type?: string;
}

export class ImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageValidationError";
  }
}

export async function pickImageSecurely(
  options?: Partial<ImageLibraryOptions>
): Promise<SecureImagePickerResult | null> {
  const mergedOptions: ImageLibraryOptions = {
    ...SECURE_PICKER_OPTIONS,
    ...options,
  };

  return new Promise((resolve, reject) => {
    void launchImageLibrary(mergedOptions, (response: ImagePickerResponse) => {
      if (response.didCancel) {
        resolve(null);
        return;
      }

      if (response.errorCode) {
        reject(new ImageValidationError(response.errorMessage || "选择图片失败"));
        return;
      }

      const asset = response.assets?.[0];
      if (!asset?.uri) {
        reject(new ImageValidationError("未获取到图片"));
        return;
      }

      if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
        reject(new ImageValidationError("图片大小不能超过10MB"));
        return;
      }

      if (
        (asset.width && asset.width > MAX_DIMENSION) ||
        (asset.height && asset.height > MAX_DIMENSION)
      ) {
        reject(new ImageValidationError(`图片尺寸不能超过${MAX_DIMENSION}x${MAX_DIMENSION}像素`));
        return;
      }

      resolve({
        uri: asset.uri,
        fileName: asset.fileName,
        fileSize: asset.fileSize,
        width: asset.width,
        height: asset.height,
        type: asset.type,
      });
    });
  });
}

export function validateImageUri(uri: string): boolean {
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp"];
  const lowerUri = uri.toLowerCase();
  return allowedExtensions.some((ext) => lowerUri.endsWith(ext));
}
