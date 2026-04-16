// Re-export shared types from @xuno/types (avoiding duplicates with local sub-modules)
export type {
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
  ClothingAttributes,
  VirtualTryOn,
  TryOnStatus,
  StyleRecommendation,
  RecommendationType,
  RecommendedItem,
  Brand,
  PriceRange,
} from "@xuno/types";

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
} from "@xuno/types";

// Mobile-specific types (re-export from src/types)
export * from "../../types/clothing";
export * from "../../types/outfit";
export * from "../../types/user";
export * from "../../types/api";
export * from "../../types/events";
export * from "../../types/navigation";
export * from "../../types/components";
export * from "../../types/animations";
export * from "../../types/social";
export * from "../../types/ai";
export * from "../../types/consultant";
export * from "../../types/chat";
export * from "../../types/customization";
export * from "../../types/form-data";

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
