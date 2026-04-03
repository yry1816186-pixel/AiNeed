/**
 * @fileoverview Core type definitions for the AiNeed platform.
 * This module contains all shared TypeScript interfaces, enums, and types
 * used across the frontend, backend, and ML services.
 * @module @aineed/types
 */

/**
 * Represents a user in the AiNeed platform.
 * @description Contains basic user information including authentication details and profile metadata.
 * @example
 * ```typescript
 * const user: User = {
 *   id: 'usr_123456',
 *   email: 'user@example.com',
 *   phone: '+8613800138000',
 *   nickname: 'Fashion Lover',
 *   avatar: 'https://cdn.aineed.com/avatars/usr_123456.jpg',
 *   gender: Gender.Female,
 *   birthDate: new Date('1990-01-15'),
 *   createdAt: new Date('2024-01-01'),
 *   updatedAt: new Date('2024-06-15')
 * };
 * ```
 */
export interface User {
  /** Unique identifier for the user (format: usr_xxxxxx) */
  id: string;
  /** User's email address (used for authentication) */
  email: string;
  /** User's phone number in E.164 format (optional) */
  phone?: string;
  /** User's display name */
  nickname?: string;
  /** URL to user's avatar image */
  avatar?: string;
  /** User's gender */
  gender?: Gender;
  /** User's date of birth */
  birthDate?: Date;
  /** Timestamp when the user account was created */
  createdAt: Date;
  /** Timestamp when the user account was last updated */
  updatedAt: Date;
}

/**
 * Enumeration of gender options available in the platform.
 * @description Used for personalization of style recommendations and clothing fit suggestions.
 * @example
 * ```typescript
 * const gender: Gender = Gender.Female;
 * console.log(gender); // 'female'
 * ```
 */
export enum Gender {
  /** Male gender */
  Male = 'male',
  /** Female gender */
  Female = 'female',
  /** Other or non-binary gender */
  Other = 'other',
}

/**
 * Extended user profile containing body measurements and style preferences.
 * @description Stores detailed information about the user's physical characteristics
 * and fashion preferences for personalized recommendations.
 * @example
 * ```typescript
 * const profile: UserProfile = {
 *   id: 'profile_123',
 *   userId: 'usr_123456',
 *   bodyType: BodyType.Hourglass,
 *   skinTone: SkinTone.Medium,
 *   faceShape: FaceShape.Oval,
 *   height: 165,
 *   weight: 55,
 *   measurements: { bust: 86, waist: 68, hip: 90 },
 *   stylePreferences: [{ id: 'style_1', name: 'Minimalist', category: StyleCategory.Minimalist }],
 *   colorPreferences: [ColorSeason.Autumn],
 *   createdAt: new Date('2024-01-01'),
 *   updatedAt: new Date('2024-06-15')
 * };
 * ```
 */
export interface UserProfile {
  /** Unique identifier for the profile */
  id: string;
  /** Reference to the associated user */
  userId: string;
  /** User's body shape classification */
  bodyType?: BodyType;
  /** User's skin tone classification */
  skinTone?: SkinTone;
  /** User's face shape classification */
  faceShape?: FaceShape;
  /** User's height in centimeters */
  height?: number;
  /** User's weight in kilograms */
  weight?: number;
  /** Detailed body measurements for clothing fit */
  measurements?: BodyMeasurements;
  /** User's preferred fashion styles */
  stylePreferences: StylePreference[];
  /** User's seasonal color analysis results */
  colorPreferences: ColorSeason[];
  /** Timestamp when the profile was created */
  createdAt: Date;
  /** Timestamp when the profile was last updated */
  updatedAt: Date;
}

/**
 * Enumeration of body type classifications.
 * @description Used to categorize body shapes for personalized clothing recommendations.
 * Each type has specific styling recommendations for optimal fit and appearance.
 * @example
 * ```typescript
 * const bodyType: BodyType = BodyType.Hourglass;
 * // Recommended: Fitted clothing that accentuates the waist
 * ```
 */
export enum BodyType {
  /** Balanced shoulders and hips with less defined waist */
  Rectangle = 'rectangle',
  /** Hips wider than shoulders */
  Triangle = 'triangle',
  /** Shoulders wider than hips */
  InvertedTriangle = 'inverted_triangle',
  /** Balanced shoulders and hips with defined waist */
  Hourglass = 'hourglass',
  /** Fuller midsection with balanced shoulders and hips */
  Oval = 'oval',
}

/**
 * Enumeration of skin tone classifications.
 * @description Used for color analysis and clothing color recommendations.
 * Helps determine which colors complement the user's natural coloring.
 * @example
 * ```typescript
 * const skinTone: SkinTone = SkinTone.Medium;
 * // Recommended colors: Warm earth tones, jewel tones
 * ```
 */
export enum SkinTone {
  /** Very light skin with pink or peach undertones */
  Fair = 'fair',
  /** Light skin with neutral or warm undertones */
  Light = 'light',
  /** Medium skin with warm or olive undertones */
  Medium = 'medium',
  /** Medium-tan skin with yellow or green undertones */
  Olive = 'olive',
  /** Tanned or light brown skin */
  Tan = 'tan',
  /** Deep brown or black skin */
  Dark = 'dark',
}

/**
 * Enumeration of face shape classifications.
 * @description Used for eyewear, hairstyle, and accessory recommendations.
 * Different face shapes are complemented by different styles.
 * @example
 * ```typescript
 * const faceShape: FaceShape = FaceShape.Oval;
 * // Most versatile face shape - suits most styles
 * ```
 */
export enum FaceShape {
  /** Balanced proportions, slightly longer than wide */
  Oval = 'oval',
  /** Similar width and length with soft curves */
  Round = 'round',
  /** Strong jawline with similar width and length */
  Square = 'square',
  /** Wider forehead, narrow chin */
  Heart = 'heart',
  /** Longer than wide with narrow jaw */
  Oblong = 'oblong',
  /** Wide cheekbones, narrow forehead and jaw */
  Diamond = 'diamond',
}

/**
 * Enumeration of seasonal color analysis categories.
 * @description Based on the 12-season color analysis system.
 * Helps determine which color palettes best complement the user's natural coloring.
 * @example
 * ```typescript
 * const colorSeason: ColorSeason = ColorSeason.Autumn;
 * // Best colors: Warm earth tones, rust, olive, camel
 * ```
 */
export enum ColorSeason {
  /** Warm and fresh - warm undertones with light to medium depth */
  Spring = 'spring',
  /** Cool and soft - cool undertones with light to medium depth */
  Summer = 'summer',
  /** Warm and deep - warm undertones with medium to deep depth */
  Autumn = 'autumn',
  /** Cool and deep - cool undertones with medium to deep depth */
  Winter = 'winter',
}

/**
 * Detailed body measurements for precise clothing fit.
 * @description Contains specific measurements used for size recommendations
 * and virtual try-on features.
 * @example
 * ```typescript
 * const measurements: BodyMeasurements = {
 *   shoulder: 40,
 *   bust: 86,
 *   waist: 68,
 *   hip: 90,
 *   inseam: 76
 * };
 * ```
 */
export interface BodyMeasurements {
  /** Shoulder width in centimeters */
  shoulder?: number;
  /** Bust circumference in centimeters */
  bust?: number;
  /** Waist circumference in centimeters */
  waist?: number;
  /** Hip circumference in centimeters */
  hip?: number;
  /** Inseam length in centimeters */
  inseam?: number;
}

/**
 * Represents a fashion style preference.
 * @description Defines a specific style category the user prefers for recommendations.
 * @example
 * ```typescript
 * const stylePreference: StylePreference = {
 *   id: 'style_minimalist',
 *   name: 'Minimalist',
 *   category: StyleCategory.Minimalist
 * };
 * ```
 */
export interface StylePreference {
  /** Unique identifier for the style preference */
  id: string;
  /** Display name of the style */
  name: string;
  /** Category classification of the style */
  category: StyleCategory;
}

/**
 * Enumeration of fashion style categories.
 * @description Primary style classifications used throughout the platform
 * for categorizing clothing and user preferences.
 * @example
 * ```typescript
 * const category: StyleCategory = StyleCategory.Minimalist;
 * // Characterized by: Clean lines, neutral colors, simple silhouettes
 * ```
 */
export enum StyleCategory {
  /** Casual, everyday wear */
  Casual = 'casual',
  /** Formal occasions, evening wear */
  Formal = 'formal',
  /** Professional, office-appropriate */
  Business = 'business',
  /** Athletic and sportswear */
  Sporty = 'sporty',
  /** Bohemian, free-spirited style */
  Bohemian = 'bohemian',
  /** Clean, simple, understated */
  Minimalist = 'minimalist',
  /** Urban, trendy street style */
  Streetwear = 'streetwear',
  /** Retro, classic styles from past decades */
  Vintage = 'vintage',
}

/**
 * Represents a user's uploaded photo for analysis.
 * @description Photos are used for body shape analysis, skin tone detection,
 * and virtual try-on features.
 * @example
 * ```typescript
 * const photo: UserPhoto = {
 *   id: 'photo_123',
 *   userId: 'usr_123456',
 *   type: PhotoType.FullBody,
 *   url: 'https://cdn.aineed.com/photos/photo_123.jpg',
 *   thumbnailUrl: 'https://cdn.aineed.com/photos/photo_123_thumb.jpg',
 *   status: PhotoStatus.Analyzed,
 *   createdAt: new Date('2024-06-15')
 * };
 * ```
 */
export interface UserPhoto {
  /** Unique identifier for the photo */
  id: string;
  /** Reference to the user who uploaded the photo */
  userId: string;
  /** Type/category of the photo */
  type: PhotoType;
  /** URL to the full-resolution photo */
  url: string;
  /** URL to the thumbnail version (optional) */
  thumbnailUrl?: string;
  /** Results from photo analysis (if completed) */
  analysisResult?: PhotoAnalysisResult;
  /** Current processing status of the photo */
  status: PhotoStatus;
  /** Timestamp when the photo was uploaded */
  createdAt: Date;
}

/**
 * Enumeration of photo types for analysis.
 * @description Different photo angles serve different analysis purposes.
 * @example
 * ```typescript
 * const photoType: PhotoType = PhotoType.FullBody;
 * // Used for: Body shape analysis, proportion assessment
 * ```
 */
export enum PhotoType {
  /** Front-facing portrait */
  Front = 'front',
  /** Side profile view */
  Side = 'side',
  /** Full body shot from head to toe */
  FullBody = 'full_body',
  /** Upper body from waist up */
  HalfBody = 'half_body',
  /** Close-up face photo */
  Face = 'face',
}

/**
 * Enumeration of photo processing statuses.
 * @description Tracks the lifecycle of photo analysis.
 */
export enum PhotoStatus {
  /** Photo uploaded, waiting for processing */
  Pending = 'pending',
  /** Currently being analyzed by ML models */
  Processing = 'processing',
  /** Analysis completed successfully */
  Analyzed = 'analyzed',
  /** Analysis failed due to error */
  Failed = 'failed',
}

/**
 * Results from ML-based photo analysis.
 * @description Contains detected body characteristics and confidence scores
 * from the image analysis pipeline.
 * @example
 * ```typescript
 * const result: PhotoAnalysisResult = {
 *   bodyType: BodyType.Hourglass,
 *   skinTone: SkinTone.Medium,
 *   faceShape: FaceShape.Oval,
 *   confidence: 0.92,
 *   rawResult: { /* raw ML output *\/ },
 *   analyzedAt: new Date('2024-06-15T10:30:00Z')
 * };
 * ```
 */
export interface PhotoAnalysisResult {
  /** Detected body type classification */
  bodyType?: BodyType;
  /** Detected skin tone classification */
  skinTone?: SkinTone;
  /** Detected face shape classification */
  faceShape?: FaceShape;
  /** Confidence score of the analysis (0-1) */
  confidence: number;
  /** Raw output from the ML model for debugging */
  rawResult: Record<string, unknown>;
  /** Timestamp when analysis was completed */
  analyzedAt: Date;
}

/**
 * Represents a clothing item in the catalog.
 * @description Core entity for all clothing products, containing
 * detailed information for search, filtering, and recommendations.
 * @example
 * ```typescript
 * const item: ClothingItem = {
 *   id: 'item_123',
 *   brandId: 'brand_zara',
 *   name: 'Oversized Linen Blazer',
 *   description: 'Relaxed-fit blazer in premium linen',
 *   category: ClothingCategory.Outerwear,
 *   colors: ['Beige', 'Black'],
 *   sizes: ['XS', 'S', 'M', 'L'],
 *   price: 899,
 *   currency: 'CNY',
 *   images: ['https://cdn.aineed.com/items/item_123_1.jpg'],
 *   tags: ['linen', 'blazer', 'summer', 'office'],
 *   attributes: {
 *     style: [StyleCategory.Business, StyleCategory.Casual],
 *     materials: ['Linen', 'Cotton'],
 *     fit: 'Relaxed'
 *   },
 *   createdAt: new Date('2024-01-01'),
 *   updatedAt: new Date('2024-06-15')
 * };
 * ```
 */
export interface ClothingItem {
  /** Unique identifier for the clothing item */
  id: string;
  /** Reference to the brand (optional for unbranded items) */
  brandId?: string;
  /** Display name of the clothing item */
  name: string;
  /** Detailed description of the item */
  description?: string;
  /** Primary category classification (string or enum value) */
  category: string | ClothingCategory;
  /** Secondary category for more specific classification */
  subcategory?: string;
  /** Available color options */
  colors: string[];
  /** Available size options */
  sizes: string[];
  /** Current price in the specified currency */
  price: number;
  /** Original price before discount (if applicable) */
  originalPrice?: number;
  /** Currency code (ISO 4217) */
  currency: string;
  /** URLs to product images */
  images: string[];
  /** Search and filter tags */
  tags: string[];
  /** URL to the product page on external site */
  externalUrl?: string;
  /** ID from external catalog system */
  externalId?: string;
  /** Additional product attributes */
  attributes?: ClothingAttributes;
  /** View count for popularity tracking */
  viewCount?: number;
  /** Like/favorite count for popularity tracking */
  likeCount?: number;
  /** Brand information (populated on fetch) */
  brand?: Brand;
  /** Timestamp when the item was added to catalog */
  createdAt?: Date;
  /** Timestamp when the item was last updated */
  updatedAt?: Date;
}

/**
 * Enumeration of clothing category classifications.
 * @description Primary categorization for all clothing items.
 */
export enum ClothingCategory {
  /** Shirts, blouses, t-shirts, sweaters */
  Tops = 'tops',
  /** Pants, jeans, skirts, shorts */
  Bottoms = 'bottoms',
  /** Dresses, jumpsuits, rompers */
  Dresses = 'dresses',
  /** Jackets, coats, blazers */
  Outerwear = 'outerwear',
  /** Shoes, boots, sandals */
  Footwear = 'footwear',
  /** Bags, jewelry, scarves, belts */
  Accessories = 'accessories',
  /** Gym wear, athletic clothing */
  Activewear = 'activewear',
  /** Swimsuits, cover-ups */
  Swimwear = 'swimwear',
}

/**
 * Additional attributes for clothing items.
 * @description Contains metadata for advanced filtering and recommendations.
 * @example
 * ```typescript
 * const attributes: ClothingAttributes = {
 *   style: [StyleCategory.Minimalist, StyleCategory.Business],
 *   occasions: ['office', 'meeting', 'dinner'],
 *   materials: ['Cotton', 'Elastane'],
 *   patterns: ['Solid'],
 *   fit: 'Regular',
 *   season: ['Spring', 'Summer', 'Fall']
 * };
 * ```
 */
export interface ClothingAttributes {
  /** Style categories the item belongs to */
  style?: StyleCategory[];
  /** Suitable occasions for the item */
  occasions?: string[];
  /** Material composition */
  materials?: string[];
  /** Pattern types (solid, striped, floral, etc.) */
  patterns?: string[];
  /** Fit type (slim, regular, relaxed, oversized) */
  fit?: string;
  /** Suitable seasons for the item */
  season?: string[];
}

/**
 * Represents a virtual try-on session.
 * @description Tracks the process of applying clothing items to user photos
 * using AI-powered virtual try-on technology.
 * @example
 * ```typescript
 * const tryOn: VirtualTryOn = {
 *   id: 'tryon_123',
 *   userId: 'usr_123456',
 *   photoId: 'photo_456',
 *   clothingItemId: 'item_789',
 *   resultImageUrl: 'https://cdn.aineed.com/tryon/tryon_123_result.jpg',
 *   status: TryOnStatus.Completed,
 *   createdAt: new Date('2024-06-15'),
 *   completedAt: new Date('2024-06-15T10:35:00Z')
 * };
 * ```
 */
export interface VirtualTryOn {
  /** Unique identifier for the try-on session */
  id: string;
  /** Reference to the user */
  userId: string;
  /** Reference to the user's photo */
  photoId: string;
  /** Reference to the clothing item to try on */
  clothingItemId: string;
  /** URL to the generated result image */
  resultImageUrl?: string;
  /** Current processing status */
  status: TryOnStatus;
  /** Timestamp when the try-on was initiated */
  createdAt: Date;
  /** Timestamp when the try-on was completed */
  completedAt?: Date;
}

/**
 * Enumeration of virtual try-on processing statuses.
 */
export enum TryOnStatus {
  /** Request received, waiting for processing */
  Pending = 'pending',
  /** Currently generating try-on image */
  Processing = 'processing',
  /** Try-on completed successfully */
  Completed = 'completed',
  /** Try-on failed due to error */
  Failed = 'failed',
}

/**
 * Represents a personalized style recommendation.
 * @description Contains a set of recommended outfits generated by the AI stylist
 * based on user preferences and body characteristics.
 * @example
 * ```typescript
 * const recommendation: StyleRecommendation = {
 *   id: 'rec_123',
 *   userId: 'usr_123456',
 *   type: RecommendationType.Daily,
 *   items: [
 *     { clothingItem: item1, score: 0.95, matchReasons: ['Matches your style', 'Flattering fit'] },
 *     { clothingItem: item2, score: 0.88, matchReasons: ['Color complements skin tone'] }
 *   ],
 *   reason: 'Based on your minimalist style preference and body type',
 *   score: 0.92,
 *   createdAt: new Date('2024-06-15')
 * };
 * ```
 */
export interface StyleRecommendation {
  /** Unique identifier for the recommendation */
  id: string;
  /** Reference to the user */
  userId: string;
  /** Type of recommendation context */
  type: RecommendationType;
  /** List of recommended items with scores */
  items: RecommendedItem[];
  /** Explanation of why these items were recommended */
  reason: string;
  /** Overall recommendation confidence score */
  score: number;
  /** Timestamp when the recommendation was generated */
  createdAt: Date;
}

/**
 * Enumeration of recommendation context types.
 */
export enum RecommendationType {
  /** Everyday outfit suggestions */
  Daily = 'daily',
  /** Event-specific recommendations */
  Occasion = 'occasion',
  /** Season-appropriate suggestions */
  Seasonal = 'seasonal',
  /** Currently popular items */
  Trending = 'trending',
}

/**
 * Represents a single recommended item with matching details.
 * @description Contains the clothing item and explanation of why it was recommended.
 */
export interface RecommendedItem {
  /** The recommended clothing item */
  clothingItem?: ClothingItem;
  /** Match score for this specific item (0-1) */
  score?: number;
  /** Reasons why this item matches the user's profile */
  matchReasons?: string[];
  /** Similarity score for visual search results */
  similarityScore?: number;
}

/**
 * Represents a clothing customization request.
 * @description Used for tailored, bespoke, or altered clothing services.
 * @example
 * ```typescript
 * const request: CustomizationRequest = {
 *   id: 'custom_123',
 *   userId: 'usr_123456',
 *   type: CustomizationType.Tailored,
 *   description: 'Need a fitted blazer adjusted for shoulder width',
 *   referenceImages: ['https://cdn.aineed.com/ref/img1.jpg'],
 *   preferences: { fabric: 'Wool', lining: 'Silk' },
 *   status: CustomizationStatus.Quoting,
 *   quotes: [quote1, quote2],
 *   createdAt: new Date('2024-06-15'),
 *   updatedAt: new Date('2024-06-16')
 * };
 * ```
 */
export interface CustomizationRequest {
  /** Unique identifier for the request */
  id: string;
  /** Reference to the user making the request */
  userId: string;
  /** Type of customization service */
  type: CustomizationType;
  /** Detailed description of the customization needed */
  description: string;
  /** URLs to reference images */
  referenceImages: string[];
  /** Additional preferences as key-value pairs */
  preferences: Record<string, unknown>;
  /** Current status of the request */
  status: CustomizationStatus;
  /** Quotes received from providers */
  quotes?: CustomizationQuote[];
  /** ID of the selected quote (if any) */
  selectedQuoteId?: string;
  /** Timestamp when the request was created */
  createdAt: Date;
  /** Timestamp when the request was last updated */
  updatedAt: Date;
}

/**
 * Enumeration of customization service types.
 */
export enum CustomizationType {
  /** Adjustments to existing clothing */
  Tailored = 'tailored',
  /** Custom-made from scratch */
  Bespoke = 'bespoke',
  /** Modifications to improve fit */
  Alteration = 'alteration',
  /** Original design creation */
  Design = 'design',
}

/**
 * Enumeration of customization request statuses.
 */
export enum CustomizationStatus {
  /** Request is being prepared */
  Draft = 'draft',
  /** Request submitted to providers */
  Submitted = 'submitted',
  /** Waiting for quotes from providers */
  Quoting = 'quoting',
  /** User confirmed a quote */
  Confirmed = 'confirmed',
  /** Work in progress */
  InProgress = 'in_progress',
  /** Work completed */
  Completed = 'completed',
  /** Request cancelled */
  Cancelled = 'cancelled',
}

/**
 * Represents a quote from a customization provider.
 * @description Contains pricing and timeline information from a service provider.
 */
export interface CustomizationQuote {
  /** Unique identifier for the quote */
  id: string;
  /** Reference to the provider */
  providerId: string;
  /** Display name of the provider */
  providerName: string;
  /** Quoted price */
  price: number;
  /** Currency code (ISO 4217) */
  currency: string;
  /** Estimated completion time in days */
  estimatedDays: number;
  /** Description of the service included */
  description: string;
  /** Timestamp when the quote was created */
  createdAt: Date;
}

/**
 * Represents a fashion brand in the catalog.
 * @description Contains brand information for clothing items.
 * @example
 * ```typescript
 * const brand: Brand = {
 *   id: 'brand_zara',
 *   name: 'ZARA',
 *   logo: 'https://cdn.aineed.com/brands/zara_logo.png',
 *   description: 'Spanish fast-fashion retailer',
 *   website: 'https://www.zara.com',
 *   categories: [ClothingCategory.Tops, ClothingCategory.Bottoms, ClothingCategory.Dresses],
 *   priceRange: PriceRange.MidRange,
 *   isActive: true
 * };
 * ```
 */
export interface Brand {
  /** Unique identifier for the brand */
  id: string;
  /** Display name of the brand */
  name: string;
  /** URL to brand logo image */
  logo?: string;
  /** URL to brand cover image */
  coverImage?: string;
  /** Brand description */
  description?: string;
  /** Brand's official website */
  website?: string;
  /** Primary category the brand belongs to */
  category?: string;
  /** Style categories the brand offers */
  style?: string[];
  /** Categories the brand offers */
  categories?: ClothingCategory[];
  /** General price range of the brand */
  priceRange?: PriceRange;
  /** Price range display string */
  priceRangeDisplay?: string;
  /** Brand rating (0-5) */
  rating?: number;
  /** Number of reviews */
  reviewCount?: number;
  /** Number of products */
  productCount?: number;
  /** Number of followers */
  followerCount?: number;
  /** Whether the current user follows this brand */
  isFollowed?: boolean;
  /** Whether the brand is currently active in the catalog */
  isActive?: boolean;
}

/**
 * Enumeration of price range categories.
 */
export enum PriceRange {
  /** Budget-friendly options */
  Budget = 'budget',
  /** Mid-range pricing */
  MidRange = 'mid_range',
  /** Higher-end pricing */
  Premium = 'premium',
  /** Luxury pricing */
  Luxury = 'luxury',
}

/**
 * Generic API response wrapper.
 * @description Standard response format for all API endpoints.
 * @example
 * ```typescript
 * // Success response
 * const response: ApiResponse<User> = {
 *   success: true,
 *   data: { id: 'usr_123', email: 'user@example.com', ... }
 * };
 *
 * // Error response
 * const errorResponse: ApiResponse<never> = {
 *   success: false,
 *   error: { code: 'USER_NOT_FOUND', message: 'User not found' }
 * };
 *
 * // Paginated response
 * const paginatedResponse: ApiResponse<ClothingItem[]> = {
 *   success: true,
 *   data: [...items],
 *   meta: { page: 1, limit: 20, total: 100 }
 * };
 * ```
 */
export interface ApiResponse<T> {
  /** Whether the request was successful */
  success: boolean;
  /** Response data (present on success) */
  data?: T;
  /** Error details (present on failure) */
  error?: ApiError;
  /** Pagination metadata (present for list endpoints) */
  meta?: {
    /** Current page number */
    page?: number;
    /** Items per page */
    limit?: number;
    /** Total number of items */
    total?: number;
  };
}

/**
 * API error details.
 * @description Standard error format for API responses.
 */
export interface ApiError {
  /** Machine-readable error code */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Additional error details for debugging */
  details?: Record<string, unknown>;
}

/**
 * Paginated response wrapper for list endpoints.
 * @description Provides a standardized format for paginated data.
 * @example
 * ```typescript
 * const response: PaginatedResponse<ClothingItem> = {
 *   items: [item1, item2, item3],
 *   page: 1,
 *   limit: 20,
 *   total: 95,
 *   totalPages: 5
 * };
 * ```
 */
export interface PaginatedResponse<T> {
  /** Array of items for the current page */
  items: T[];
  /** Current page number (1-indexed) */
  page: number;
  /** Number of items per page */
  pageSize: number;
  /** Legacy field name (for backward compatibility) */
  // @deprecated Use pageSize instead
  limit: number;
  /** Total number of items across all pages */
  total: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there are more items available */
  hasMore?: boolean;
}
