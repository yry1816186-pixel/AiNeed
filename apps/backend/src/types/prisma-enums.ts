// Auto-generated from Prisma schema
// Re-run: node scripts/generate-prisma-enums.cjs

export enum CouponType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
  SHIPPING = 'SHIPPING',
}

export enum UserCouponStatus {
  AVAILABLE = 'AVAILABLE',
  USED = 'USED',
  EXPIRED = 'EXPIRED',
}

export enum StockNotificationStatus {
  PENDING = 'PENDING',
  NOTIFIED = 'NOTIFIED',
  CANCELLED = 'CANCELLED',
}

export enum RefundType {
  REFUND_ONLY = 'REFUND_ONLY',
  RETURN_REFUND = 'RETURN_REFUND',
}

export enum RefundRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
}

export enum Gender {
  male = 'male',
  female = 'female',
  other = 'other',
}

export enum AuthProvider {
  email = 'email',
  phone = 'phone',
  wechat = 'wechat',
}

export enum OnboardingStep {
  BASIC_INFO = 'BASIC_INFO',
  PHOTO = 'PHOTO',
  STYLE_TEST = 'STYLE_TEST',
  COMPLETED = 'COMPLETED',
}

export enum BodyType {
  rectangle = 'rectangle',
  triangle = 'triangle',
  inverted_triangle = 'inverted_triangle',
  hourglass = 'hourglass',
  oval = 'oval',
}

export enum SkinTone {
  fair = 'fair',
  light = 'light',
  medium = 'medium',
  olive = 'olive',
  tan = 'tan',
  dark = 'dark',
}

export enum FaceShape {
  oval = 'oval',
  round = 'round',
  square = 'square',
  heart = 'heart',
  oblong = 'oblong',
  diamond = 'diamond',
}

export enum ColorSeason {
  spring_warm = 'spring_warm',
  spring_light = 'spring_light',
  summer_cool = 'summer_cool',
  summer_light = 'summer_light',
  autumn_warm = 'autumn_warm',
  autumn_deep = 'autumn_deep',
  winter_cool = 'winter_cool',
  winter_deep = 'winter_deep',
}

export enum FitPreference {
  tight = 'tight',
  regular = 'regular',
  loose = 'loose',
}

export enum PhotoType {
  front = 'front',
  side = 'side',
  full_body = 'full_body',
  half_body = 'half_body',
  face = 'face',
}

export enum AnalysisStatus {
  pending = 'pending',
  processing = 'processing',
  completed = 'completed',
  failed = 'failed',
}

export enum PriceRange {
  budget = 'budget',
  mid_range = 'mid_range',
  premium = 'premium',
  luxury = 'luxury',
}

export enum ClothingCategory {
  tops = 'tops',
  bottoms = 'bottoms',
  dresses = 'dresses',
  outerwear = 'outerwear',
  footwear = 'footwear',
  accessories = 'accessories',
  activewear = 'activewear',
  swimwear = 'swimwear',
}

export enum TryOnStatus {
  pending = 'pending',
  processing = 'processing',
  completed = 'completed',
  failed = 'failed',
}

export enum CustomizationType {
  tailored = 'tailored',
  bespoke = 'bespoke',
  alteration = 'alteration',
  design = 'design',
  pod = 'pod',
}

export enum CustomizationStatus {
  draft = 'draft',
  submitted = 'submitted',
  quoting = 'quoting',
  confirmed = 'confirmed',
  in_progress = 'in_progress',
  shipped = 'shipped',
  completed = 'completed',
  cancelled = 'cancelled',
}

export enum ProductTemplateType {
  tshirt = 'tshirt',
  hat = 'hat',
  shoes = 'shoes',
  bag = 'bag',
  phone_case = 'phone_case',
  mug = 'mug',
}

export enum DesignLayerType {
  image = 'image',
  text = 'text',
  shape = 'shape',
}

export enum RecommendationType {
  daily = 'daily',
  occasion = 'occasion',
  seasonal = 'seasonal',
  trending = 'trending',
  business = 'business',
}

export enum InteractionWeight {
  view = 'view',
  click = 'click',
  like = 'like',
  favorite = 'favorite',
  addToCart = 'addToCart',
  purchase = 'purchase',
  tryOn = 'tryOn',
  share = 'share',
  dislike = 'dislike',
}

export enum BehaviorEventType {
  page_view = 'page_view',
  item_view = 'item_view',
  search = 'search',
  filter = 'filter',
  click = 'click',
  scroll = 'scroll',
  try_on_start = 'try_on_start',
  try_on_complete = 'try_on_complete',
  favorite = 'favorite',
  unfavorite = 'unfavorite',
  share = 'share',
  add_to_cart = 'add_to_cart',
  remove_from_cart = 'remove_from_cart',
  purchase = 'purchase',
  recommendation_view = 'recommendation_view',
  recommendation_click = 'recommendation_click',
  post_create = 'post_create',
  post_like = 'post_like',
  post_comment = 'post_comment',
  user_follow = 'user_follow',
}

export enum AiStylistSessionStatus {
  active = 'active',
  archived = 'archived',
}

export enum SubscriptionStatus {
  active = 'active',
  expired = 'expired',
  cancelled = 'cancelled',
  past_due = 'past_due',
}

export enum PaymentStatus {
  pending = 'pending',
  paid = 'paid',
  failed = 'failed',
  refunded = 'refunded',
  cancelled = 'cancelled',
}

export enum NotificationType {
  subscription_activated = 'subscription_activated',
  subscription_expiring = 'subscription_expiring',
  renewal_failed = 'renewal_failed',
  try_on_completed = 'try_on_completed',
  try_on_failed = 'try_on_failed',
  daily_recommendation = 'daily_recommendation',
  price_drop = 'price_drop',
  new_follower = 'new_follower',
  comment = 'comment',
  like = 'like',
  bookmark = 'bookmark',
  reply_mention = 'reply_mention',
  blogger_product_sold = 'blogger_product_sold',
  content_approved = 'content_approved',
  content_rejected = 'content_rejected',
  report_resolved = 'report_resolved',
  system_update = 'system_update',
  privacy_reminder = 'privacy_reminder',
}

export enum ExportStatus {
  pending = 'pending',
  processing = 'processing',
  completed = 'completed',
  expired = 'expired',
}

export enum DeletionStatus {
  pending = 'pending',
  processing = 'processing',
  completed = 'completed',
  cancelled = 'cancelled',
}

export enum MerchantRole {
  admin = 'admin',
  editor = 'editor',
  viewer = 'viewer',
}

export enum SettlementStatus {
  pending = 'pending',
  processing = 'processing',
  paid = 'paid',
}

export enum PaymentRecordStatus {
  pending = 'pending',
  paid = 'paid',
  failed = 'failed',
  refunded = 'refunded',
  cancelled = 'cancelled',
  closed = 'closed',
}

export enum RefundRecordStatus {
  processing = 'processing',
  success = 'success',
  failed = 'failed',
}

export enum OrderStatus {
  pending = 'pending',
  paid = 'paid',
  processing = 'processing',
  shipped = 'shipped',
  delivered = 'delivered',
  cancelled = 'cancelled',
  refunded = 'refunded',
}

export enum QuizQuestionType {
  visual_choice = 'visual_choice',
  text_choice = 'text_choice',
  slider = 'slider',
}

export enum ConsultantStatus {
  pending = 'pending',
  active = 'active',
  suspended = 'suspended',
  inactive = 'inactive',
}

export enum ServiceType {
  styling_consultation = 'styling_consultation',
  wardrobe_audit = 'wardrobe_audit',
  shopping_companion = 'shopping_companion',
  color_analysis = 'color_analysis',
  special_event = 'special_event',
}

export enum BookingStatus {
  pending = 'pending',
  confirmed = 'confirmed',
  in_progress = 'in_progress',
  completed = 'completed',
  cancelled = 'cancelled',
  no_show = 'no_show',
}

export enum SenderType {
  user = 'user',
  consultant = 'consultant',
}

export enum MessageType {
  text = 'text',
  image = 'image',
  file = 'file',
  system = 'system',
  proposal = 'proposal',
}

export enum EarningStatus {
  pending = 'pending',
  settled = 'settled',
  failed = 'failed',
}

export enum WithdrawalStatus {
  pending = 'pending',
  processing = 'processing',
  completed = 'completed',
  rejected = 'rejected',
}

export enum CollectionItemType {
  post = 'post',
  outfit = 'outfit',
  try_on = 'try_on',
}

export enum UserRole {
  user = 'user',
  admin = 'admin',
  superadmin = 'superadmin',
  ops = 'ops',
  customer_service = 'customer_service',
  reviewer = 'reviewer',
}
