import {
  PermissionsAndroid,
  Platform,
  type Permission,
  type PermissionStatus,
} from "react-native";
import {
  launchCamera as nativeLaunchCamera,
  launchImageLibrary as nativeLaunchImageLibrary,
  type Asset as NativeAsset,
  type CameraOptions as NativeCameraOptions,
  type ImageLibraryOptions as NativeImageLibraryOptions,
  type ImagePickerResponse as NativeImagePickerResponse,
} from "react-native-image-picker";

export interface ImagePickerAsset {
  uri: string;
  width: number;
  height: number;
  fileName?: string;
  type?: string;
  fileSize?: number;
}

export interface ImagePickerResult {
  canceled: boolean;
  granted?: boolean;
  assets?: ImagePickerAsset[];
}

export interface PermissionResult {
  status: string;
  granted: boolean;
  canAskAgain?: boolean;
}

export interface ImagePickerOptions {
  mediaTypes?: string;
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
  allowsMultipleSelection?: boolean;
  selectionLimit?: number;
}

type NativeMediaType = "photo" | "video" | "mixed";

function getAndroidApiLevel(): number {
  if (typeof Platform.Version === "number") {
    return Platform.Version;
  }

  const parsed = Number.parseInt(String(Platform.Version), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toNativeMediaType(mediaTypes?: string): NativeMediaType {
  switch (mediaTypes) {
    case MediaTypeOptions.Videos:
      return "video";
    case MediaTypeOptions.All:
      return "mixed";
    case MediaTypeOptions.Images:
    default:
      return "photo";
  }
}

function toImageAsset(asset: NativeAsset): ImagePickerAsset | null {
  if (!asset.uri) {
    return null;
  }

  return {
    uri: asset.uri,
    width: asset.width ?? 0,
    height: asset.height ?? 0,
    fileName: asset.fileName,
    type: asset.type,
    fileSize: asset.fileSize,
  };
}

function toPickerResult(
  response?: NativeImagePickerResponse,
): ImagePickerResult {
  if (!response || response.didCancel) {
    return { canceled: true };
  }

  if (response.errorCode) {
    throw new Error(response.errorMessage ?? response.errorCode);
  }

  const assets = (response.assets ?? [])
    .map(toImageAsset)
    .filter((asset): asset is ImagePickerAsset => asset !== null);

  if (assets.length === 0) {
    return { canceled: true };
  }

  return {
    canceled: false,
    assets,
  };
}

function normalizeQuality(
  quality?: number,
): NativeCameraOptions["quality"] | undefined {
  if (typeof quality !== "number") {
    return undefined;
  }

  const normalized = Math.max(0, Math.min(1, quality));
  return normalized as NativeCameraOptions["quality"];
}

async function requestAndroidPermissions(
  permissions: Permission[],
): Promise<PermissionResult> {
  const statuses = (await PermissionsAndroid.requestMultiple(
    permissions,
  )) as Partial<Record<Permission, PermissionStatus>>;
  const granted = permissions.every(
    (permission) =>
      statuses[permission] === PermissionsAndroid.RESULTS.GRANTED,
  );

  return {
    status: granted ? "granted" : "denied",
    granted,
    canAskAgain: permissions.every(
      (permission) =>
        statuses[permission] !== PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN,
    ),
  };
}

function buildLibraryOptions(
  options?: ImagePickerOptions,
): NativeImageLibraryOptions {
  return {
    mediaType: toNativeMediaType(options?.mediaTypes),
    quality: normalizeQuality(options?.quality),
    selectionLimit: options?.allowsMultipleSelection
      ? options?.selectionLimit ?? 0
      : options?.selectionLimit ?? 1,
  };
}

function buildCameraOptions(options?: ImagePickerOptions): NativeCameraOptions {
  return {
    mediaType: toNativeMediaType(options?.mediaTypes),
    quality: normalizeQuality(options?.quality),
    saveToPhotos: false,
  };
}

export async function launchImageLibraryAsync(
  options?: ImagePickerOptions,
): Promise<ImagePickerResult> {
  const response = await nativeLaunchImageLibrary(buildLibraryOptions(options));
  return toPickerResult(response);
}

export async function launchCameraAsync(
  options?: ImagePickerOptions,
): Promise<ImagePickerResult> {
  const response = await nativeLaunchCamera(buildCameraOptions(options));
  return toPickerResult(response);
}

export async function requestMediaLibraryPermissionsAsync(): Promise<PermissionResult> {
  if (Platform.OS !== "android") {
    return { status: "granted", granted: true, canAskAgain: true };
  }

  const androidApiLevel = getAndroidApiLevel();
  if (androidApiLevel >= 33) {
    // Android Photo Picker does not require broad storage permission.
    return { status: "granted", granted: true, canAskAgain: true };
  }

  const readMediaImages = PermissionsAndroid.PERMISSIONS
    .READ_MEDIA_IMAGES as Permission;
  const readExternalStorage = PermissionsAndroid.PERMISSIONS
    .READ_EXTERNAL_STORAGE as Permission;
  const permissions =
    androidApiLevel >= 33 ? [readMediaImages] : [readExternalStorage];

  return requestAndroidPermissions(permissions);
}

export async function requestCameraPermissionsAsync(): Promise<PermissionResult> {
  if (Platform.OS !== "android") {
    return { status: "granted", granted: true, canAskAgain: true };
  }

  return requestAndroidPermissions([
    PermissionsAndroid.PERMISSIONS.CAMERA as Permission,
  ]);
}

export const MediaTypeOptions = {
  All: "All",
  Images: "Images",
  Videos: "Videos",
} as const;

export default {
  launchImageLibraryAsync,
  launchCameraAsync,
  requestMediaLibraryPermissionsAsync,
  requestCameraPermissionsAsync,
  MediaTypeOptions,
};
