/**
 * Social domain shared types
 * Aligned with Prisma schema enums for type safety across domains
 */

// ==================== Consultant ====================

export enum ConsultantStatus {
  Pending = 'pending',
  Active = 'active',
  Suspended = 'suspended',
  Inactive = 'inactive',
}

export enum ServiceType {
  StylingConsultation = 'styling_consultation',
  WardrobeAudit = 'wardrobe_audit',
  ShoppingCompanion = 'shopping_companion',
  ColorAnalysis = 'color_analysis',
  SpecialEvent = 'special_event',
}

export enum BookingStatus {
  Pending = 'pending',
  Confirmed = 'confirmed',
  InProgress = 'in_progress',
  Completed = 'completed',
  Cancelled = 'cancelled',
  NoShow = 'no_show',
}

// ==================== Chat ====================

export enum SenderType {
  User = 'user',
  Consultant = 'consultant',
}

export enum MessageType {
  Text = 'text',
  Image = 'image',
  File = 'file',
  System = 'system',
  Proposal = 'proposal',
}

// ==================== Community ====================

export enum PostCategory {
  Outfit = 'outfit',
  Trend = 'trend',
  Review = 'review',
  Question = 'question',
  Inspiration = 'inspiration',
}

export enum PostSortBy {
  Latest = 'latest',
  Popular = 'popular',
  MostLiked = 'most_liked',
}

// ==================== Earnings ====================

export enum EarningStatus {
  Pending = 'pending',
  Paid = 'paid',
  Cancelled = 'cancelled',
}

export enum WithdrawalStatus {
  Pending = 'pending',
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed',
}
