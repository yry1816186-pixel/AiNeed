export type Gender = 'male' | 'female' | 'other';

export type BodyType = 'rectangle' | 'triangle' | 'inverted_triangle' | 'hourglass' | 'oval';

export type SkinTone = 'fair' | 'light' | 'medium' | 'olive' | 'tan' | 'dark';

export type FaceShape = 'oval' | 'round' | 'square' | 'heart' | 'oblong' | 'diamond';

export type ColorSeasonType = 'spring' | 'summer' | 'autumn' | 'winter';

export type OnboardingStep = 'BASIC_INFO' | 'PHOTO' | 'STYLE_TEST' | 'COMPLETED';

export type AgeRange = 'under_18' | '18_24' | '25_34' | '35_44' | '45_54' | '55_plus';

export type PhotoType = 'front' | 'side' | 'full_body' | 'half_body' | 'face';

export type AnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type TryOnStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type ClothingCategory =
  | 'tops'
  | 'bottoms'
  | 'dresses'
  | 'outerwear'
  | 'footwear'
  | 'accessories'
  | 'activewear'
  | 'swimwear';

export type PriceRange = 'budget' | 'mid_range' | 'premium' | 'luxury';

export type OrderStatus =
  | 'pending'
  | 'paid'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type PostStatus = 'active' | 'hidden' | 'deleted';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'cancelled';

export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'past_due';

export type RecommendationType = 'daily' | 'occasion' | 'seasonal' | 'trending' | 'business';

export type CustomizationType = 'tailored' | 'bespoke' | 'alteration' | 'design';

export type CustomizationStatus =
  | 'draft'
  | 'submitted'
  | 'quoting'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type NotificationType =
  | 'subscription_activated'
  | 'subscription_expiring'
  | 'renewal_failed'
  | 'try_on_completed'
  | 'try_on_failed'
  | 'daily_recommendation'
  | 'price_drop'
  | 'new_follower'
  | 'comment'
  | 'like'
  | 'system_update'
  | 'privacy_reminder';

export type QuizQuestionType = 'visual_choice' | 'text_choice' | 'slider';

export type MerchantRole = 'admin' | 'editor' | 'viewer';

export type SettlementStatus = 'pending' | 'processing' | 'paid';

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export type ServiceType =
  | 'styling_consultation'
  | 'wardrobe_audit'
  | 'shopping_companion'
  | 'color_analysis'
  | 'special_event';

export type ConsultantStatus = 'pending' | 'active' | 'suspended' | 'inactive';

export type SenderType = 'user' | 'consultant';

export type MessageType = 'text' | 'image' | 'file' | 'system';

export type CollectionItemType = 'post' | 'outfit' | 'try_on';

export type ExportStatus = 'pending' | 'processing' | 'completed' | 'expired';

export type DeletionStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

export type BehaviorEventType =
  | 'page_view'
  | 'item_view'
  | 'search'
  | 'filter'
  | 'click'
  | 'scroll'
  | 'try_on_start'
  | 'try_on_complete'
  | 'favorite'
  | 'unfavorite'
  | 'share'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'purchase'
  | 'recommendation_view'
  | 'recommendation_click'
  | 'post_create'
  | 'post_like'
  | 'post_comment'
  | 'user_follow';

export type PaymentRecordStatus =
  | 'pending'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'cancelled'
  | 'closed';

export type RefundRecordStatus = 'processing' | 'success' | 'failed';
