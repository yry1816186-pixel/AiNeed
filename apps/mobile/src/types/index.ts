export type {
  User,
  UserProfile,
  BodyMeasurements,
  StylePreference,
  UserPhoto,
  PhotoAnalysisResult,
  ClothingAttributes,
  VirtualTryOn,
  StyleRecommendation,
  RecommendedItem,
  CustomizationRequest,
  CustomizationQuote,
  ApiResponse,
  ApiError,
  PaginatedResponse,
} from "@xuno/types";

export {
  Gender,
  BodyType,
  SkinTone,
  FaceShape,
  ColorSeason,
  StyleCategory,
  PhotoType,
  PhotoStatus,
  ClothingCategory,
  ClothingItem,
  Brand,
  PriceRange,
  TryOnStatus,
  RecommendationType,
  CustomizationType,
  CustomizationStatus,
} from "@xuno/types";

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
export * from "./consultant";
export * from "./chat";
export * from "./customization";
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
