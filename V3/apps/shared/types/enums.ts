export const Gender = {
  Male: 'male',
  Female: 'female',
  Neutral: 'neutral',
} as const;
export type Gender = (typeof Gender)[keyof typeof Gender];

export const BodyType = {
  Pear: 'pear',
  Apple: 'apple',
  Hourglass: 'hourglass',
  Rectangle: 'rectangle',
  InvertedTriangle: 'inverted_triangle',
} as const;
export type BodyType = (typeof BodyType)[keyof typeof BodyType];

export const ColorSeason = {
  Spring: 'spring',
  Summer: 'summer',
  Autumn: 'autumn',
  Winter: 'winter',
} as const;
export type ColorSeason = (typeof ColorSeason)[keyof typeof ColorSeason];

export const ClothingCategory = {
  Top: 'top',
  Bottom: 'bottom',
  Outerwear: 'outerwear',
  Shoes: 'shoes',
  Bag: 'bag',
  Accessory: 'accessory',
  Hat: 'hat',
  Dress: 'dress',
} as const;
export type ClothingCategory = (typeof ClothingCategory)[keyof typeof ClothingCategory];

export const Occasion = {
  Work: 'work',
  Date: 'date',
  Sport: 'sport',
  Casual: 'casual',
  Party: 'party',
  Campus: 'campus',
  Interview: 'interview',
  Travel: 'travel',
} as const;
export type Occasion = (typeof Occasion)[keyof typeof Occasion];

export const StyleTag = {
  Minimalist: 'minimalist',
  Korean: 'korean',
  Japanese: 'japanese',
  Streetwear: 'streetwear',
  Chinoiserie: 'chinoiserie',
  French: 'french',
  Vintage: 'vintage',
  Sporty: 'sporty',
  Preppy: 'preppy',
} as const;
export type StyleTag = (typeof StyleTag)[keyof typeof StyleTag];

export const OrderStatus = {
  Pending: 'pending',
  Paid: 'paid',
  Producing: 'producing',
  Shipped: 'shipped',
  Done: 'done',
  Refunded: 'refunded',
} as const;
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const BespokeOrderStatus = {
  Submitted: 'submitted',
  Quoted: 'quoted',
  Paid: 'paid',
  InProgress: 'in_progress',
  Completed: 'completed',
  Cancelled: 'cancelled',
} as const;
export type BespokeOrderStatus = (typeof BespokeOrderStatus)[keyof typeof BespokeOrderStatus];

export const PostStatus = {
  Published: 'published',
  Draft: 'draft',
  Archived: 'archived',
} as const;
export type PostStatus = (typeof PostStatus)[keyof typeof PostStatus];

export const DesignStatus = {
  Draft: 'draft',
  UnderReview: 'under_review',
  Published: 'published',
  Rejected: 'rejected',
  Archived: 'archived',
} as const;
export type DesignStatus = (typeof DesignStatus)[keyof typeof DesignStatus];

export const NotificationType = {
  Like: 'like',
  Comment: 'comment',
  Follow: 'follow',
  System: 'system',
  OrderStatus: 'order_status',
  TryonComplete: 'tryon_complete',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const InteractionType = {
  View: 'view',
  Like: 'like',
  Favorite: 'favorite',
  Purchase: 'purchase',
  Skip: 'skip',
} as const;
export type InteractionType = (typeof InteractionType)[keyof typeof InteractionType];

export const BudgetRange = {
  Under100: 'under_100',
  Under200: 'under_200',
  Under500: 'under_500',
  Over500: 'over_500',
} as const;
export type BudgetRange = (typeof BudgetRange)[keyof typeof BudgetRange];

export const ProductType = {
  Tshirt: 'tshirt',
  Hoodie: 'hoodie',
  Hat: 'hat',
  Bag: 'bag',
  PhoneCase: 'phone_case',
  Shoes: 'shoes',
} as const;
export type ProductType = (typeof ProductType)[keyof typeof ProductType];

export const Material = {
  Cotton: 'cotton',
  Polyester: 'polyester',
  Canvas: 'canvas',
  Leather: 'leather',
} as const;
export type Material = (typeof Material)[keyof typeof Material];

export const TryOnStatus = {
  Pending: 'pending',
  Processing: 'processing',
  Completed: 'completed',
  Failed: 'failed',
} as const;
export type TryOnStatus = (typeof TryOnStatus)[keyof typeof TryOnStatus];

export const OutfitImageStatus = {
  Pending: 'pending',
  Processing: 'processing',
  Completed: 'completed',
  Failed: 'failed',
} as const;
export type OutfitImageStatus = (typeof OutfitImageStatus)[keyof typeof OutfitImageStatus];

export const ClothingSlot = {
  Top: 'top',
  Bottom: 'bottom',
  Outer: 'outer',
  Shoes: 'shoes',
  Accessory: 'accessory',
  Dress: 'dress',
} as const;
export type ClothingSlot = (typeof ClothingSlot)[keyof typeof ClothingSlot];

export const MessageType = {
  Text: 'text',
  Image: 'image',
  File: 'file',
  Quote: 'quote',
} as const;
export type MessageType = (typeof MessageType)[keyof typeof MessageType];

export const BespokeQuoteStatus = {
  Pending: 'pending',
  Accepted: 'accepted',
  Rejected: 'rejected',
  Expired: 'expired',
} as const;
export type BespokeQuoteStatus = (typeof BespokeQuoteStatus)[keyof typeof BespokeQuoteStatus];

export const DesignReportStatus = {
  Pending: 'pending',
  Reviewing: 'reviewing',
  Resolved: 'resolved',
  Dismissed: 'dismissed',
} as const;
export type DesignReportStatus = (typeof DesignReportStatus)[keyof typeof DesignReportStatus];

export const PreReviewResult = {
  Pass: 'pass',
  Flag: 'flag',
  Reject: 'reject',
} as const;
export type PreReviewResult = (typeof PreReviewResult)[keyof typeof PreReviewResult];

export const UserRole = {
  User: 'user',
  Admin: 'admin',
  Studio: 'studio',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];
