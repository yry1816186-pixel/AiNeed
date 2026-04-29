# API Changelog

All notable changes to the 寻裳 XunO API will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] — 2026-04-29

### Added

#### Auth (`/api/v1/auth`)

- `POST /auth/register` — Email/password registration with JWT tokens (rate: 5 req/min)
- `POST /auth/login` — Email/password login (rate: 5 req/min)
- `POST /auth/refresh` — JWT token refresh with rotation (rate: 10 req/min)
- `POST /auth/logout` — Session invalidation with optional refresh token revocation
- `GET /auth/me` — Current user profile retrieval
- `POST /auth/forgot-password` — Password reset email (rate: 3 req/min)
- `POST /auth/reset-password` — Password reset confirmation
- `POST /auth/sms/send` — SMS verification code (rate: 1 req/60s)
- `POST /auth/sms/login` — Phone number + SMS code login
- `POST /auth/phone-register` — Phone number registration
- `POST /auth/wechat/login` — WeChat OAuth login

#### AI Stylist (`/api/v1/ai-stylist`)

- `POST /ai-stylist/sessions` — Create consultation session (rate: 20 req/min, 50 daily)
- `GET /ai-stylist/sessions` — List user sessions
- `GET /ai-stylist/sessions/{id}` — Get session with message history
- `DELETE /ai-stylist/sessions/{id}` — Delete session
- `POST /ai-stylist/sessions/{id}/messages` — Send message (rate: 20 req/min, 50 daily)
- `POST /ai-stylist/sessions/{id}/photo` — Upload photo for session
- `POST /ai-stylist/sessions/{id}/resolve` — Generate outfit recommendation
- `POST /ai-stylist/chat` — Legacy stateless chat (deprecated, rate: 20 req/min)

#### Try-On (`/api/v1/try-on`)

- `POST /try-on` — Virtual try-on request (quota: 3/day)
- `GET /try-on/history` — Try-on history with pagination
- `GET /try-on/{id}` — Try-on status/details
- `DELETE /try-on/{id}` — Delete try-on record
- `GET /try-on/{id}/result-image` — Get result image binary

#### Recommendations (`/api/v1/recommendations`)

- `GET /recommendations` — Personalized recommendations (rate: 20 req/min)
- `GET /recommendations/advanced` — Multi-strategy fused recommendations
- `GET /recommendations/daily` — Daily outfit recommendation
- `GET /recommendations/trending` — Platform-wide trending (no auth required)
- `GET /recommendations/occasion` — Occasion-based recommendations
- `GET /recommendations/discover` — Discover page feed
- `GET /recommendations/style-guide` — Personal style guide
- `GET /recommendations/complete-the-look/{clothingId}` — Complete the look pairing
- `POST /recommendations/feedback` — Submit recommendation feedback
- `POST /recommendations/feedback/batch` — Batch feedback submission
- `GET /recommendations/cold-start` — Cold-start recommendations for new users

#### Wardrobe (`/api/v1/wardrobe`)

- `GET /wardrobe` — List wardrobe items with filtering
- `POST /wardrobe` — Add item to wardrobe
- `GET /wardrobe/{id}` — Get item details
- `PUT /wardrobe/{id}` — Update wardrobe item
- `DELETE /wardrobe/{id}` — Remove item
- `GET /wardrobe/curated` — Curated wardrobe view by category
- `GET /wardrobe/curated/wishlist` — Wishlist items
- `POST /wardrobe/curated/wishlist/{itemId}` — Add to wishlist
- `DELETE /wardrobe/curated/wishlist/{itemId}` — Remove from wishlist
- `GET /wardrobe/curated/purchased` — Purchased items
- `GET /wardrobe/curated/stats` — Wardrobe statistics
- `GET /wardrobe/collections` — List collections
- `POST /wardrobe/collections` — Create collection
- `GET/PUT/DELETE /wardrobe/collections/{id}` — Collection CRUD
- `POST/GET/PUT/DELETE /wardrobe/collections/{id}/items` — Collection items management

#### Discover / Community (`/api/v1/community`)

- `GET /community/posts` — Community feed with sorting (rate: 60 req/min)
- `POST /community/posts` — Create post (rate: 10 req/min)
- `GET /community/trending` — Trending posts
- `GET /community/posts/following` — Following feed
- `GET /community/posts/recommended` — Recommended posts
- `GET/PUT/DELETE /community/posts/{id}` — Post detail/update/delete
- `POST /community/posts/{id}/like` — Toggle like
- `POST /community/posts/{id}/bookmark` — Bookmark post
- `POST /community/posts/{id}/share` — Share post
- `GET/POST /community/posts/{id}/comments` — Comments
- `POST /community/reports` — Report content
- `POST /community/users/{id}/follow` — Follow/unfollow user
- `GET /community/users/{id}/profile` — User public profile

#### Profile (`/api/v1/profile`)

- `GET/PUT /profile` — Full profile read/update
- `GET /profile/body-analysis` — Body type analysis report
- `GET /profile/color-analysis` — Seasonal color analysis
- `GET /profile/style-recommendations` — Style recommendations
- `GET /profile/body-metrics` — Body metrics (BMI, etc.)
- `GET /profile/summary` — Profile summary
- `GET/PUT /profile/preferences` — Style/color/price preferences
- `PUT /profile/preferences/styles` — Update style preferences
- `PUT /profile/preferences/colors` — Update color preferences
- `PUT /profile/preferences/price-range` — Update price range
- `POST /profile/refresh-from-behavior` — Recalculate from behavior
- `GET /profile/completeness` — Profile completeness percentage
- `POST /profile/share-poster` — Generate share poster

#### Additional Endpoints

- Users CRUD (`/api/v1/users`)
- Photo upload and management (`/api/v1/photos`)
- Photo quality check and enhancement (`/api/v1/photo-quality`)
- Onboarding flow (`/api/v1/onboarding`)
- AI image analysis and enrichment (`/api/v1/ai`)
- Task queue management (`/api/v1/queue`)
- Clothing catalog (`/api/v1/clothing`)
- Search (`/api/v1/search`)
- Shopping cart (`/api/v1/cart`)
- Orders (`/api/v1/orders`)
- Payment (`/api/v1/payment`)
- Notifications (`/api/v1/notifications`)
- Favorites (`/api/v1/favorites`)
- Style quiz (`/api/v1/style-quiz`)
- Weather-based suggestions (`/api/v1/weather`)
- Poster generation (`/api/v1/poster`)
- Health check (`/api/v1/health`)
- Metrics (`/api/v1/metrics`)
- Admin dashboard and management (`/api/v1/admin`)

### Security

- JWT Bearer authentication on all protected endpoints
- Dual rate limiting: `@Throttle` burst protection + `AiQuotaGuard` daily quota on all AI endpoints
- CSRF protection via double-submit cookie pattern (`SameSite` + CSRF token endpoint)
- XSS sanitization pipe on all input
- Helmet security headers (CSP, CORP, COOP, COEP, referrer policy)
- Input validation via `class-validator` decorators with whitelist mode
- CORS configured per environment (strict in production)

### Breaking Changes

- None (initial release)

### Deprecated

- `POST /api/v1/ai-stylist/chat` — Use session-based API (`/ai-stylist/sessions`) instead

---

_This changelog is maintained alongside the OpenAPI specification at `docs/api/openapi.yaml`._
_Auto-generated spec available at `docs/api/openapi.json` (NestJS Swagger)._
