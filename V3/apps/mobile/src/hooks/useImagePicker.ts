import { useState, useCallback } from 'react';
import {
  launchCameraAsync,
  launchImageLibraryAsync,
  requestCameraPermissionsAsync,
  requestMediaLibraryPermissionsAsync,
  type ImagePickerResult,
  type ImagePickerOptions,
  type ImagePickerAsset,
} from 'expo-image-picker';

interface ImagePickerHookOptions {
  maxWidth?: number;
  quality?: number;
  allowsMultiple?: boolean;
}

interface ImagePickerState {
  images: ImagePickerAsset[];
  pickImage: () => Promise<void>;
  pickMultiple: () => Promise<void>;
  takePhoto: () => Promise<void>;
  clear: () => void;
}

const DEFAULT_MAX_WIDTH = 1920;
const DEFAULT_QUALITY = 0.8;

function buildPickerOptions(
  opts: ImagePickerHookOptions,
  allowsMultiple: boolean,
): ImagePickerOptions {
  return {
    mediaTypes: ['images'],
    allowsEditing: !allowsMultiple,
    allowsMultipleSelection: allowsMultiple,
    quality: opts.quality ?? DEFAULT_QUALITY,
    exif: false,
    base64: false,
  };
}

function processResult(result: ImagePickerResult): ImagePickerAsset[] {
  if (result.canceled) return [];
  return result.assets;
}

/**
 * useImagePicker - 图片选择 Hook
 * 用于拍照/相册选择场景，自动压缩（maxWidth 1920, 质量 0.8）
 *
 * @param options  配置项：maxWidth, quality, allowsMultiple
 * @returns        图片列表和操作方法
 */
export function useImagePicker(
  options: ImagePickerHookOptions = {},
): ImagePickerState {
  const [images, setImages] = useState<ImagePickerAsset[]>([]);

  const pickImage = useCallback(async () => {
    const permission = await requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await launchImageLibraryAsync(
      buildPickerOptions(options, false),
    );
    const picked = processResult(result);
    if (picked.length > 0) {
      setImages(picked);
    }
  }, [options]);

  const pickMultiple = useCallback(async () => {
    const permission = await requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await launchImageLibraryAsync(
      buildPickerOptions(options, true),
    );
    const picked = processResult(result);
    if (picked.length > 0) {
      setImages((prev) => [...prev, ...picked]);
    }
  }, [options]);

  const takePhoto = useCallback(async () => {
    const permission = await requestCameraPermissionsAsync();
    if (!permission.granted) return;

    const result = await launchCameraAsync(
      buildPickerOptions(options, false),
    );
    const picked = processResult(result);
    if (picked.length > 0) {
      setImages(picked);
    }
  }, [options]);

  const clear = useCallback(() => {
    setImages([]);
  }, []);

  return { images, pickImage, pickMultiple, takePhoto, clear };
}

export type { ImagePickerHookOptions, ImagePickerState };
