# CONSENT_REQUIREMENTS.md — API Consent Enforcement Reference

## Overview

All endpoints processing sensitive user data require explicit user consent. The consent system uses the `@RequireConsent()` decorator validated by the global `ConsentGuard`.

## Consent Types

| Consent Type                 | Scope                        | Required For                                                        |
| ---------------------------- | ---------------------------- | ------------------------------------------------------------------- |
| `photos`                     | User photo upload/processing | Photo upload, AI image analysis, virtual try-on, search by image    |
| `body_metrics`               | Body measurement data        | Body analysis, body type classification, measurements               |
| `ai_domestic_no_crossborder` | AI processing within China   | AI stylist chat, personalized recommendations, AI-generated content |
| `tracking`                   | Usage analytics              | Behavioral tracking for recommendations                             |
| `marketing`                  | Marketing communications     | Push notifications, promotional content                             |
| `analytics`                  | Anonymous analytics          | App usage statistics                                                |

## Endpoints Requiring Consent

### AI Controller (`/api/v1/ai`)

| Endpoint                 | Consent Required               |
| ------------------------ | ------------------------------ |
| POST `/ai/analyze`       | `photos`                       |
| POST `/ai/body-analysis` | `photos`, `body_metrics`       |
| POST `/ai/similar`       | `photos`                       |
| Others                   | No consent (product data only) |

### AI Stylist (`/api/v1/stylist`)

| All non-public endpoints | `ai_domestic_no_crossborder` |

### Try-On (`/api/v1/tryon`)

| All endpoints | `photos` |

### Photos (`/api/v1/photos`)

| All endpoints | `photos` |

### Profile (`/api/v1/profile`)

| Body analysis/upload | `body_metrics` |
| Color analysis upload | `photos` |
| Basic CRUD | No consent |

### Recommendations (`/api/v1/recommendations`)

| All personalized endpoints | `ai_domestic_no_crossborder` |

### Search (`/api/v1/search`)

| Image search | `photos` |

## Error Response

When consent is missing, the API returns HTTP 403:

```json
{
  "success": false,
  "error": {
    "code": "MISSING_CONSENT",
    "message": "需要以下授权才能继续: photos, body_metrics"
  }
}
```

## Implementation

- **Decorator**: `@RequireConsent("type1", "type2")` from `consent.guard.ts`
- **Guard**: Global `ConsentGuard` in `app.module.ts` — checks UserConsent table
- **Service**: `PrivacyService.requireConsent(userId, types)` — throws ForbiddenException
- **Onboarding**: Consent recorded during onboarding via `onboarding.service.ts`
