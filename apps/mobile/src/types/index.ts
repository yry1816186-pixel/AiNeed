// Re-export shared types from @xuno/types
export type {
  User,
  UserProfile,
  Gender,
  BodyType,
  SkinTone,
  FaceShape,
  ColorSeason,
  BodyMeasurements,
  StylePreference,
  StyleCategory,
  UserPhoto,
  PhotoType,
  PhotoStatus,
  PhotoAnalysisResult,
  ClothingItem as SharedClothingItem,
  ClothingCategory,
  ClothingAttributes,
  VirtualTryOn,
  TryOnStatus,
  StyleRecommendation,
  RecommendationType,
  RecommendedItem,
  CustomizationRequest,
  CustomizationType,
  CustomizationStatus,
  CustomizationQuote,
  Brand,
  PriceRange,
  ApiResponse,
  ApiError,
  PaginatedResponse,
} from '@xuno/types';

export {
  Gender as SharedGender,
  BodyType as SharedBodyType,
  SkinTone as SharedSkinTone,
  FaceShape as SharedFaceShape,
  ColorSeason as SharedColorSeason,
  StyleCategory as SharedStyleCategory,
  PhotoType as SharedPhotoType,
  PhotoStatus as SharedPhotoStatus,
  ClothingCategory as SharedClothingCategory,
  TryOnStatus as SharedTryOnStatus,
  RecommendationType as SharedRecommendationType,
  CustomizationType as SharedCustomizationType,
  CustomizationStatus as SharedCustomizationStatus,
  PriceRange as SharedPriceRange,
} from '@xuno/types';

// Mobile-specific types (not in shared package)
export * from "./clothing";
export * from "./outfit";
export * from "./user";
export * from "./api";
export * from "./events";
export * from "./navigation";
export * from "./components";
export * from "./animations";
export * from "./social";
export * from "./ai";
export * from "./form-data";

export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type PickRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OmitKeys<T, K extends keyof T> = Omit<T, K>;

export type ValueOf<T> = T[keyof T];

export type KeysOf<T> = keyof T;

export type ArrayElement<T> = T extends readonly (infer E)[] ? E : never;
