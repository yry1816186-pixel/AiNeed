export interface ClothingItem {
  id: string;
  brandId?: string;
  name: string;
  description?: string;
  category: string | ClothingCategory;
  subcategory?: string;
  colors: string[];
  sizes: string[];
  price: number;
  originalPrice?: number;
  currency: string;
  images: string[];
  tags: string[];
  externalUrl?: string;
  externalId?: string;
  attributes?: ClothingAttributes;
  viewCount?: number;
  likeCount?: number;
  brand?: Brand;
  createdAt?: Date;
  updatedAt?: Date;
}

export enum ClothingCategory {
  Tops = 'tops',
  Bottoms = 'bottoms',
  Dresses = 'dresses',
  Outerwear = 'outerwear',
  Footwear = 'footwear',
  Accessories = 'accessories',
  Activewear = 'activewear',
  Swimwear = 'swimwear',
}

export interface ClothingAttributes {
  style?: import('./profile').StyleCategory[];
  occasions?: string[];
  materials?: string[];
  patterns?: string[];
  fit?: string;
  season?: string[];
}

export interface Brand {
  id: string;
  name: string;
  logo?: string;
  coverImage?: string;
  description?: string;
  website?: string;
  category?: string;
  style?: string[];
  categories?: ClothingCategory[];
  priceRange?: PriceRange;
  priceRangeDisplay?: string;
  rating?: number;
  reviewCount?: number;
  productCount?: number;
  followerCount?: number;
  isFollowed?: boolean;
  isActive?: boolean;
}

export enum PriceRange {
  Budget = 'budget',
  MidRange = 'mid_range',
  Premium = 'premium',
  Luxury = 'luxury',
}
