# FRONTEND_BACKEND_CONTRACTS.md — API Contract Reference

## Core Entity: ClothingItem / Product

| Contract Field | Type | Required | Backend Source | Frontend Usage |
|---------------|------|----------|---------------|---------------|
| id | string (UUID) | Yes | Database PK | Item detail, cart item, wardrobe item |
| sourceId | string | Yes | import-fashion-dataset.py | Source deduplication |
| source | enum: DataSource | Yes | Prisma enum | Filtering, transparency |
| name | string (max 200) | Yes | productDisplayName | Display name |
| category | enum: ClothingCategory | Yes | masterCategory mapping | Category filter, browse |
| subcategory | enum: ClothingSubCategory | Yes | subCategory mapping | Subcategory filter |
| colors | string[] | Yes | baseColour → array | Color filter, UI chips |
| gender | enum: Gender | Yes | CSV gender mapping | Gender filter |
| season | string? | No | CSV season field | Season filter |
| year | int? | No | CSV year field | Metadata |
| usage | string? | No | CSV usage field | Occasion filter |
| price | Decimal? | No | source (usually null) | Price display |
| currency | string? | No | source (usually null) | Price formatting |
| imageUrl | string? | No | external/uploaded | Product image |
| brand | string? | No | verified prefix match | Brand display |
| description | string? | No | generated/metadata | Detail page |
| isDemo | boolean | Yes | import flag | Filter in production |
| isMock | boolean | Yes | import flag | Filter in production |
| tags | string[] | No | generated | Search, filter |

## AI/ML Contract Fields

| Field | Type | Source |
|-------|------|--------|
| bodyType | enum: BodyType | Body analysis endpoint |
| skinTone | string | Color season analysis |
| stylePreferences | string[] | User onboarding |
| colorPreferences | string[] | User preferences |
| priceRange | enum: PriceRange | User preferences |
| occasion | string | User input/context |

## Recommendation Response

```typescript
interface Recommendation {
  id: string;
  outfitName: string;
  items: Array<{
    category: string;
    item: string;
    reason: string;
    clothingId?: string;
  }>;
  stylingTips: string[];
  reasoningSummary: string;
  totalPrice?: string;
  confidence?: number;
  isMock: boolean; // Always present
}
```

## Error Response Format

```typescript
interface ApiError {
  success: false;
  error: {
    code: string;       // e.g., "MISSING_CONSENT", "UNAUTHORIZED", "VALIDATION_ERROR"
    message: string;    // Human-readable (Chinese primary)
    details?: unknown;  // Structured validation errors
  };
}
```

## Consent-Dependent Endpoints

All endpoints marked with `@RequireConsent()` will return **403 Forbidden** with code `"MISSING_CONSENT"` when consent not granted:

```json
{
  "success": false,
  "error": {
    "code": "MISSING_CONSENT",
    "message": "需要以下授权才能继续: photos, body_metrics"
  }
}
```

Frontend must:
1. Check consent status before calling protected endpoints
2. Display consent gate UI when 403 is received
3. Allow users to grant/revoke consent
4. Show honest unavailable state when consent is missing
