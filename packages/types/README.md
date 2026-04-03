# @aineed/types

Shared TypeScript type definitions for the AiNeed platform.

## Overview

This package contains all shared interfaces, enums, and types used across the AiNeed ecosystem:

- **Frontend** (Next.js application)
- **Backend** (NestJS API server)
- **ML Services** (Python FastAPI services)

## Installation

```bash
# From the monorepo root
npm install

# Or directly in this package
cd packages/types
npm install
```

## Usage

```typescript
import {
  User,
  Gender,
  UserProfile,
  BodyType,
  ClothingItem,
  ApiResponse,
  PaginatedResponse
} from '@aineed/types';

// Use types in your code
const user: User = {
  id: 'usr_123',
  email: 'user@example.com',
  createdAt: new Date(),
  updatedAt: new Date()
};

// API response typing
const response: ApiResponse<ClothingItem[]> = {
  success: true,
  data: [...items],
  meta: { page: 1, limit: 20, total: 100 }
};
```

## Type Categories

### User Types

| Type | Description |
|------|-------------|
| `User` | Basic user information |
| `UserProfile` | Extended profile with body measurements and preferences |
| `Gender` | Gender enumeration |
| `BodyType` | Body shape classification |
| `SkinTone` | Skin tone classification |
| `FaceShape` | Face shape classification |
| `ColorSeason` | Seasonal color analysis |

### Clothing Types

| Type | Description |
|------|-------------|
| `ClothingItem` | Product catalog item |
| `ClothingCategory` | Product category enumeration |
| `ClothingAttributes` | Product metadata |
| `Brand` | Brand information |
| `PriceRange` | Price tier enumeration |

### Photo & Analysis Types

| Type | Description |
|------|-------------|
| `UserPhoto` | Uploaded photo record |
| `PhotoType` | Photo category (full body, face, etc.) |
| `PhotoStatus` | Processing status |
| `PhotoAnalysisResult` | ML analysis results |

### Recommendation Types

| Type | Description |
|------|-------------|
| `StyleRecommendation` | Personalized recommendation set |
| `RecommendedItem` | Single recommended item |
| `RecommendationType` | Recommendation context type |
| `StylePreference` | User style preference |
| `StyleCategory` | Fashion style enumeration |

### Virtual Try-On Types

| Type | Description |
|------|-------------|
| `VirtualTryOn` | Try-on session record |
| `TryOnStatus` | Processing status |

### Customization Types

| Type | Description |
|------|-------------|
| `CustomizationRequest` | Tailoring/bespoke request |
| `CustomizationType` | Service type enumeration |
| `CustomizationStatus` | Request status |
| `CustomizationQuote` | Provider quote |

### API Types

| Type | Description |
|------|-------------|
| `ApiResponse<T>` | Generic API response wrapper |
| `ApiError` | Error details |
| `PaginatedResponse<T>` | Paginated list response |

## Building

```bash
# Build the package
npm run build

# Build in watch mode
npm run dev
```

The build outputs:
- `dist/index.js` - CommonJS format
- `dist/index.mjs` - ES Module format
- `dist/index.d.ts` - TypeScript declarations

## Example Usage

### User Profile

```typescript
import { UserProfile, BodyType, SkinTone, ColorSeason } from '@aineed/types';

const profile: UserProfile = {
  id: 'profile_123',
  userId: 'usr_123',
  bodyType: BodyType.Hourglass,
  skinTone: SkinTone.Medium,
  colorPreferences: [ColorSeason.Autumn],
  stylePreferences: [],
  createdAt: new Date(),
  updatedAt: new Date()
};
```

### Clothing Item

```typescript
import { ClothingItem, ClothingCategory, StyleCategory } from '@aineed/types';

const item: ClothingItem = {
  id: 'item_001',
  name: 'Silk Blend Blouse',
  category: ClothingCategory.Tops,
  colors: ['Ivory', 'Black'],
  sizes: ['XS', 'S', 'M', 'L'],
  price: 599,
  currency: 'CNY',
  images: ['https://cdn.example.com/item_001.jpg'],
  tags: ['silk', 'blouse', 'office'],
  attributes: {
    style: [StyleCategory.Business, StyleCategory.Minimalist],
    materials: ['Silk', 'Polyester']
  },
  createdAt: new Date(),
  updatedAt: new Date()
};
```

### API Response

```typescript
import { ApiResponse, PaginatedResponse, ClothingItem } from '@aineed/types';

// Success response
const successResponse: ApiResponse<User> = {
  success: true,
  data: { id: 'usr_123', email: 'user@example.com', ... }
};

// Error response
const errorResponse: ApiResponse<never> = {
  success: false,
  error: {
    code: 'USER_NOT_FOUND',
    message: 'User not found'
  }
};

// Paginated response
const paginatedResponse: PaginatedResponse<ClothingItem> = {
  items: [...],
  page: 1,
  limit: 20,
  total: 100,
  totalPages: 5
};
```

## License

MIT
