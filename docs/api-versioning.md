# API Versioning Strategy

## Overview

xuno API uses **URI-based versioning** as the primary versioning strategy, which provides clear, explicit version identifiers in the API path.

## Versioning Format

```
/api/v{major}/resource
```

**Examples:**
- `/api/v1/users` - Version 1 of users API
- `/api/v2/recommendations` - Version 2 of recommendations API

## Current Version

- **Default Version:** `1`
- **Supported Versions:** `1`

## Configuration

The API versioning is configured in `main.ts`:

```typescript
app.setGlobalPrefix("api");
app.enableVersioning({
  type: VersioningType.URI,
  defaultVersion: "1",
});
```

## Version Lifecycle

### 1. Active Development
- New features can be added to existing versions without breaking changes
- Minor enhancements that are backward-compatible

### 2. Deprecation
- Old versions marked as deprecated but remain functional
- Deprecation notices sent via:
  - `X-API-Deprecated` response header
  - `X-API-Sunset` header with deprecation date
  - API documentation warnings

### 3. Sunset Period
- Minimum 6 months notice before version removal
- Regular reminders to migrate to new version

### 4. Retirement
- Old version is removed
- Requests return `410 Gone` status

## Migration Guide

### Adding a New Version

1. Create a new controller with version suffix:
```typescript
@Controller({ path: 'users', version: '2' })
export class UsersV2Controller {
  // New implementation
}
```

2. Keep old controller for backward compatibility:
```typescript
@Controller({ path: 'users', version: '1' })
export class UsersV1Controller {
  // Legacy implementation (deprecated)
}
```

3. Update documentation with migration guide

### Breaking Changes Requiring New Version

- Removing or renaming endpoints
- Changing request/response structure
- Modifying authentication requirements
- Altering error response formats

### Non-Breaking Changes (No Version Bump)

- Adding new optional fields to responses
- Adding new endpoints
- Adding optional request parameters
- Performance improvements

## Version-Specific Headers

### Request Headers
```http
X-API-Version: 1  # Explicit version request (optional with URI versioning)
Accept: application/vnd.xuno.v1+json  # Content negotiation alternative
```

### Response Headers
```http
X-API-Version: 1  # Current API version
X-API-Deprecated: true  # If version is deprecated
X-API-Sunset: Sat, 01 Jan 2027 00:00:00 GMT  # Deprecation date
X-API-Latest-Version: 2  # Recommended version to migrate to
```

## Per-Resource Versioning (Future)

For granular control, individual resources can be versioned:

```typescript
@Controller({
  path: 'recommendations',
  version: ['1', '2'],  // Support multiple versions
})
export class RecommendationsController {
  // Implementation that handles both versions
}
```

## Documentation

### Swagger/OpenAPI Integration

Version-specific documentation is available at:
- `/api/docs` - Default version documentation
- `/api/docs/v1` - Version 1 specific documentation (future)

### Deprecation Documentation

When deprecating endpoints:
```typescript
@ApiOperation({
  summary: 'Get user recommendations',
  deprecated: true,
  description: 'Use /v2/recommendations instead. Will be removed in v3.',
})
```

## Version Support Matrix

| Version | Status | Release Date | Sunset Date | Notes |
|---------|--------|--------------|-------------|-------|
| v1 | Active | 2024-01-01 | - | Current stable version |
| v2 | Planned | TBD | - | Next major release |

## Best Practices

### For API Consumers
1. Always specify the version in your requests
2. Handle deprecation headers gracefully
3. Subscribe to API changelog notifications
4. Test against new versions during sunset period

### For API Developers
1. Maintain backward compatibility within major versions
2. Document all breaking changes thoroughly
3. Provide migration guides for version upgrades
4. Use feature flags for gradual rollouts

## Error Responses

### Unsupported Version
```json
{
  "statusCode": 400,
  "message": "Unsupported API version: 99",
  "error": "Bad Request",
  "supportedVersions": ["1"]
}
```

### Deprecated Version Warning
```json
{
  "statusCode": 200,
  "data": {...},
  "warning": "API version 1 is deprecated. Migrate to version 2 by 2027-01-01"
}
```

### Retired Version
```json
{
  "statusCode": 410,
  "message": "API version 1 is no longer supported. Please use version 2.",
  "error": "Gone"
}
```

## Implementation Checklist

- [x] URI versioning enabled
- [x] Default version set to "1"
- [x] Global prefix "api" configured
- [ ] Version-specific Swagger documentation
- [ ] Deprecation headers middleware
- [ ] Version support matrix documentation
- [ ] Migration guide for future versions
