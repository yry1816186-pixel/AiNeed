// Re-export Prisma-generated enums and model types so the app uses a single
// source of truth for runtime enum values and compile-time enum types.

import {
  AnalysisStatus as PrismaAnalysisStatus,
  AiStylistSessionStatus as PrismaAiStylistSessionStatus,
  AuthProvider as PrismaAuthProvider,
  BehaviorEventType as PrismaBehaviorEventType,
  BodyType as PrismaBodyType,
  BookingStatus as PrismaBookingStatus,
  ClothingCategory as PrismaClothingCategory,
  CollectionItemType as PrismaCollectionItemType,
  ColorSeason as PrismaColorSeason,
  ConsultantStatus as PrismaConsultantStatus,
  CouponType as PrismaCouponType,
  CustomizationStatus as PrismaCustomizationStatus,
  CustomizationType as PrismaCustomizationType,
  DeletionStatus as PrismaDeletionStatus,
  DesignLayerType as PrismaDesignLayerType,
  EarningStatus as PrismaEarningStatus,
  ExportStatus as PrismaExportStatus,
  FaceShape as PrismaFaceShape,
  Gender as PrismaGender,
  MerchantRole as PrismaMerchantRole,
  MessageType as PrismaMessageType,
  NotificationType as PrismaNotificationType,
  OnboardingStep as PrismaOnboardingStep,
  OrderStatus as PrismaOrderStatus,
  PaymentRecordStatus as PrismaPaymentRecordStatus,
  PaymentStatus as PrismaPaymentStatus,
  PhotoType as PrismaPhotoType,
  PriceRange as PrismaPriceRange,
  ProductTemplateType as PrismaProductTemplateType,
  QuizQuestionType as PrismaQuizQuestionType,
  RecommendationType as PrismaRecommendationType,
  RefundRecordStatus as PrismaRefundRecordStatus,
  RefundRequestStatus as PrismaRefundRequestStatus,
  RefundType as PrismaRefundType,
  SenderType as PrismaSenderType,
  ServiceType as PrismaServiceType,
  SettlementStatus as PrismaSettlementStatus,
  SkinTone as PrismaSkinTone,
  StockNotificationStatus as PrismaStockNotificationStatus,
  SubscriptionStatus as PrismaSubscriptionStatus,
  TryOnStatus as PrismaTryOnStatus,
  UserCouponStatus as PrismaUserCouponStatus,
  UserRole as PrismaUserRole,
  UserProfile as PrismaGeneratedUserProfile,
  WithdrawalStatus as PrismaWithdrawalStatus,
} from "@prisma/client";

export const CouponType = PrismaCouponType;
export type CouponType = PrismaCouponType;

export const UserCouponStatus = PrismaUserCouponStatus;
export type UserCouponStatus = PrismaUserCouponStatus;

export const StockNotificationStatus = PrismaStockNotificationStatus;
export type StockNotificationStatus = PrismaStockNotificationStatus;

export const RefundType = PrismaRefundType;
export type RefundType = PrismaRefundType;

export const RefundRequestStatus = PrismaRefundRequestStatus;
export type RefundRequestStatus = PrismaRefundRequestStatus;

export const Gender = PrismaGender;
export type Gender = PrismaGender;

export const AuthProvider = PrismaAuthProvider;
export type AuthProvider = PrismaAuthProvider;

export const OnboardingStep = PrismaOnboardingStep;
export type OnboardingStep = PrismaOnboardingStep;

export const BodyType = PrismaBodyType;
export type BodyType = PrismaBodyType;

export const SkinTone = PrismaSkinTone;
export type SkinTone = PrismaSkinTone;

export const FaceShape = PrismaFaceShape;
export type FaceShape = PrismaFaceShape;

export const ColorSeason = PrismaColorSeason;
export type ColorSeason = PrismaColorSeason;

export const FitPreference = {
  tight: "tight",
  regular: "regular",
  loose: "loose",
} as const;
export type FitPreference = (typeof FitPreference)[keyof typeof FitPreference];

export const PhotoType = PrismaPhotoType;
export type PhotoType = PrismaPhotoType;

export const AnalysisStatus = PrismaAnalysisStatus;
export type AnalysisStatus = PrismaAnalysisStatus;

export const PriceRange = PrismaPriceRange;
export type PriceRange = PrismaPriceRange;

export const ClothingCategory = PrismaClothingCategory;
export type ClothingCategory = PrismaClothingCategory;

export const TryOnStatus = PrismaTryOnStatus;
export type TryOnStatus = PrismaTryOnStatus;

export const CustomizationType = PrismaCustomizationType;
export type CustomizationType = PrismaCustomizationType;

export const CustomizationStatus = PrismaCustomizationStatus;
export type CustomizationStatus = PrismaCustomizationStatus;

export const ProductTemplateType = PrismaProductTemplateType;
export type ProductTemplateType = PrismaProductTemplateType;

export const DesignLayerType = PrismaDesignLayerType;
export type DesignLayerType = PrismaDesignLayerType;

export const RecommendationType = PrismaRecommendationType;
export type RecommendationType = PrismaRecommendationType;

export const InteractionWeight = {
  view: "view",
  click: "click",
  like: "like",
  favorite: "favorite",
  addToCart: "addToCart",
  purchase: "purchase",
  tryOn: "tryOn",
  share: "share",
  dislike: "dislike",
} as const;
export type InteractionWeight = (typeof InteractionWeight)[keyof typeof InteractionWeight];

export const BehaviorEventType = PrismaBehaviorEventType;
export type BehaviorEventType = PrismaBehaviorEventType;

export const AiStylistSessionStatus = PrismaAiStylistSessionStatus;
export type AiStylistSessionStatus = PrismaAiStylistSessionStatus;

export const SubscriptionStatus = PrismaSubscriptionStatus;
export type SubscriptionStatus = PrismaSubscriptionStatus;

export const PaymentStatus = PrismaPaymentStatus;
export type PaymentStatus = PrismaPaymentStatus;

export const NotificationType = PrismaNotificationType;
export type NotificationType = PrismaNotificationType;

export const ExportStatus = PrismaExportStatus;
export type ExportStatus = PrismaExportStatus;

export const DeletionStatus = PrismaDeletionStatus;
export type DeletionStatus = PrismaDeletionStatus;

export const MerchantRole = PrismaMerchantRole;
export type MerchantRole = PrismaMerchantRole;

export const SettlementStatus = PrismaSettlementStatus;
export type SettlementStatus = PrismaSettlementStatus;

export const PaymentRecordStatus = PrismaPaymentRecordStatus;
export type PaymentRecordStatus = PrismaPaymentRecordStatus;

export const RefundRecordStatus = PrismaRefundRecordStatus;
export type RefundRecordStatus = PrismaRefundRecordStatus;

export const OrderStatus = PrismaOrderStatus;
export type OrderStatus = PrismaOrderStatus;

export const QuizQuestionType = PrismaQuizQuestionType;
export type QuizQuestionType = PrismaQuizQuestionType;

export const ConsultantStatus = PrismaConsultantStatus;
export type ConsultantStatus = PrismaConsultantStatus;

export const ServiceType = PrismaServiceType;
export type ServiceType = PrismaServiceType;

export const BookingStatus = PrismaBookingStatus;
export type BookingStatus = PrismaBookingStatus;

export const SenderType = PrismaSenderType;
export type SenderType = PrismaSenderType;

export const MessageType = PrismaMessageType;
export type MessageType = PrismaMessageType;

export const EarningStatus = PrismaEarningStatus;
export type EarningStatus = PrismaEarningStatus;

export const WithdrawalStatus = PrismaWithdrawalStatus;
export type WithdrawalStatus = PrismaWithdrawalStatus;

export const CollectionItemType = PrismaCollectionItemType;
export type CollectionItemType = PrismaCollectionItemType;

export const UserRole = PrismaUserRole;
export type UserRole = PrismaUserRole;

export type PrismaUserProfile = PrismaGeneratedUserProfile;
