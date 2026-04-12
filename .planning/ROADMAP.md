# Roadmap: AiNeed

## Overview

AiNeed is an AI-powered fashion platform moving from scaffolded prototype to commercial production. The journey starts by making the core AI features actually work (virtual try-on + AI stylist), then secures user data, polishes the mobile experience, builds the commerce loop, adds social engagement, personalizes recommendations, and hardens quality and operations for launch. The existing 35 backend modules and 28 mobile screens provide scaffolding; this roadmap fills in real business logic and AI integration.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: ML Pipeline & Virtual Try-On** - Core AI inference pipeline working end-to-end with GPU management and queue processing
- [ ] **Phase 2: AI Stylist Integration** - Multi-turn fashion consultation with GLM API, safety filtering, and conversation persistence
- [ ] **Phase 3: Privacy & Data Security** - Photo encryption, EXIF stripping, upload validation, consent flows, and rate limiting
- [ ] **Phase 4: Mobile UX & Performance** - App launch speed, onboarding quiz, upload UX, theming, offline handling, haptic feedback
- [ ] **Phase 5: Commerce & Payment** - Product catalog, cart, Alipay/WeChat Pay checkout, order tracking, refunds, merchant dashboard
- [ ] **Phase 6: Community & Content Moderation** - Community feed with posts, likes, comments, follows, AI content screening, reporting
- [ ] **Phase 7: Notifications** - Push notifications for orders and community, preference management, in-app notification center
- [ ] **Phase 8: Recommendation Engine** - Personalized clothing recommendations, style quiz integration, color harmony, feedback loop
- [ ] **Phase 9: Quality Engineering** - 80%+ test coverage, integration tests, E2E mobile tests, API contract tests, performance benchmarks, CI
- [ ] **Phase 10: DevOps & Production Readiness** - Sentry, structured logging, Prometheus/Grafana dashboards, deployment pipeline, backup procedures

## Phase Details

### Phase 1: ML Pipeline & Virtual Try-On
**Goal**: Users can upload a photo and a garment image and receive a virtual try-on result within 15 seconds, with reliable GPU management and cloud fallback
**Depends on**: Nothing (first phase -- existing scaffold provides base infrastructure)
**Requirements**: ML-01, ML-02, ML-03, ML-04, ML-05, ML-06, ML-07
**Success Criteria** (what must be TRUE):
  1. User uploads a person photo and garment image, and receives a virtual try-on result within 15 seconds
  2. Try-on results preserve garment details (logos, patterns, colors appear correctly on the generated image)
  3. When GPU inference fails, the system automatically falls back to cloud API without user-visible errors
  4. User sees real-time processing status updates (queued, processing, complete) via WebSocket
  5. Repeated try-on with the same photo+garment combination returns the cached result instantly
**Plans**: TBD

### Phase 2: AI Stylist Integration
**Goal**: Users can have meaningful multi-turn fashion conversations with an AI stylist that understands their preferences and context
**Depends on**: Phase 1 (ML pipeline provides the AI service foundation and user photo processing)
**Requirements**: AIS-01, AIS-02, AIS-03, AIS-04, AIS-05
**Success Criteria** (what must be TRUE):
  1. User can have a multi-turn text conversation with the AI stylist about fashion advice
  2. AI stylist suggests complete outfits based on the user's style profile, body type, and preferences
  3. AI stylist incorporates current weather data to recommend weather-appropriate clothing
  4. User can close and reopen the app, then resume a previous AI stylist conversation from where they left off
  5. AI stylist responses are filtered through a safety layer that blocks inappropriate or harmful content
**Plans**: TBD

### Phase 3: Privacy & Data Security
**Goal**: All user photos and body data are encrypted, validated, and handled with proper consent -- meeting PIPL compliance requirements
**Depends on**: Phase 1 (photo upload pipeline exists), Phase 2 (AI processing uses user data)
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, SEC-07
**Success Criteria** (what must be TRUE):
  1. User photos stored on disk are encrypted with per-user keys and cannot be read without the key
  2. Body measurement data in API responses is never returned in plaintext
  3. Uploaded images have EXIF metadata (GPS, camera info) stripped before storage
  4. API endpoints enforce rate limits, and abusers receive 429 responses after threshold
  5. User explicitly consents to photo and body data processing before any upload proceeds
  6. Expired try-on results are automatically deleted after the retention period
**Plans**: TBD

### Phase 4: Mobile UX & Performance
**Goal**: The mobile app feels fast, polished, and delightful with smooth onboarding, responsive interactions, and offline resilience
**Depends on**: Phase 1 (try-on pipeline working), Phase 2 (AI stylist available), Phase 3 (secure upload flows)
**Requirements**: UX-01, UX-02, UX-03, UX-04, UX-05, UX-06, UX-07
**Success Criteria** (what must be TRUE):
  1. App launches from cold start to usable state within 3 seconds
  2. New user completes a style quiz during onboarding that initializes their style profile
  3. Image upload shows a progress bar with percentage and a retry button if upload fails
  4. Feed screens display skeleton placeholders while loading content, then smoothly replace with real data
  5. User can toggle between dark and light theme with smooth visual transition
  6. User feels haptic feedback when performing key actions (liking, adding to cart, purchasing)
  7. When network drops, user sees an offline indicator and queued actions sync automatically on reconnect
**Plans**: TBD
**UI hint**: yes

### Phase 5: Commerce & Payment
**Goal**: Users can browse products, complete purchases via Alipay or WeChat Pay, and track orders; merchants can list products and manage orders
**Depends on**: Phase 3 (secure data handling), Phase 4 (polished mobile UX for shopping flows)
**Requirements**: COMM-01, COMM-02, COMM-03, COMM-04, COMM-05, COMM-06, COMM-07, COMM-08, COMM-09
**Success Criteria** (what must be TRUE):
  1. User can browse a product catalog and filter by category, price range, brand, and size
  2. User adds items to cart with selected size and color, then completes checkout via Alipay or WeChat Pay
  3. User receives an order confirmation after payment and can track order status (confirmed, shipped, delivered)
  4. User can request a refund within the policy window and see the refund status
  5. Merchant can create product listings with images, pricing, inventory count, and variants
  6. Merchant can view incoming orders, confirm them, mark as shipped, and complete them
  7. Merchant sees a dashboard with sales analytics including revenue, order count, and top products
**Plans**: TBD
**UI hint**: yes

### Phase 6: Community & Content Moderation
**Goal**: Users share try-on results in a vibrant community feed with AI-powered content moderation keeping it safe
**Depends on**: Phase 1 (try-on results to share), Phase 4 (polished feed UX)
**Requirements**: SOC-01, SOC-02, SOC-03, SOC-04, SOC-05, SOC-06
**Success Criteria** (what must be TRUE):
  1. User can post a try-on result to the community feed with a text caption
  2. User can like and comment on other users' community posts
  3. User can follow other users and see followed users' posts in their feed
  4. All community posts pass through AI content screening before publication, with inappropriate content blocked
  5. User can report a post for manual review, and the report is visible to moderators
  6. Community feed scrolls infinitely with smooth pagination and no visible loading jumps
**Plans**: TBD
**UI hint**: yes

### Phase 7: Notifications
**Goal**: Users stay informed about order updates and community interactions through push notifications they can control
**Depends on**: Phase 5 (order status events), Phase 6 (community interaction events)
**Requirements**: NOTIF-01, NOTIF-02, NOTIF-03, NOTIF-04
**Success Criteria** (what must be TRUE):
  1. User receives a push notification when their order status changes (confirmed, shipped, delivered)
  2. User receives a push notification for community interactions (new like, comment, or follower)
  3. User can toggle notification preferences per category (orders, community, promotions) in settings
  4. User can open an in-app notification center that shows all notifications with read/unread state
**Plans**: TBD
**UI hint**: yes

### Phase 8: Recommendation Engine
**Goal**: Users receive personalized clothing recommendations that improve over time based on their interactions and style profile
**Depends on**: Phase 2 (AI service integration), Phase 4 (style quiz data), Phase 5 (product catalog and interaction data)
**Requirements**: REC-01, REC-02, REC-03, REC-04, REC-05
**Success Criteria** (what must be TRUE):
  1. User sees a personalized "Recommended for You" section based on their style profile and past interactions
  2. User viewing a product sees "Complete the Look" suggestions for complementary items
  3. New user who completed the onboarding style quiz immediately sees relevant recommendations
  4. User's like/dislike actions on recommendations visibly improve future suggestion relevance
  5. Recommendation results include a color harmony score indicating how well items pair together
**Plans**: TBD
**UI hint**: yes

### Phase 9: Quality Engineering
**Goal**: The codebase has comprehensive automated test coverage, CI gates, and performance benchmarks ensuring commercial-grade reliability
**Depends on**: Phase 1 through Phase 8 (all features implemented and available for testing)
**Requirements**: QA-01, QA-02, QA-03, QA-04, QA-05, QA-06
**Success Criteria** (what must be TRUE):
  1. Backend test suite achieves >= 80% line coverage across all modules, verified by CI
  2. Integration tests cover the four critical flows: auth, try-on, payment, and order lifecycle
  3. E2E tests verify the core mobile user journey from login through try-on to purchase
  4. API contract tests run on every PR and block merge if backward compatibility breaks
  5. Performance benchmarks confirm try-on API responds within 15s and feed API within 500ms
  6. CI pipeline runs all tests on every commit and prevents merging when tests fail
**Plans**: TBD

### Phase 10: DevOps & Production Readiness
**Goal**: The platform has full observability, automated deployment, and recovery procedures ready for production traffic
**Depends on**: Phase 9 (tests passing, CI pipeline operational)
**Requirements**: OPS-01, OPS-02, OPS-03, OPS-04, OPS-05, OPS-06
**Success Criteria** (what must be TRUE):
  1. Backend errors are captured in Sentry with full stack traces, correlated with mobile app errors
  2. All backend log entries include a request correlation ID that traces the full request lifecycle
  3. Prometheus exposes custom metrics for ML inference latency and success rate, visible in Grafana
  4. Grafana dashboards display business metrics: try-ons per day, conversion rate, active users
  5. Deployment pipeline deploys to staging/production with a single command and supports one-click rollback
  6. Database backup procedure is documented, tested, and restoration verified at least once
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 through 10

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. ML Pipeline & Virtual Try-On | 0/? | Not started | - |
| 2. AI Stylist Integration | 0/? | Not started | - |
| 3. Privacy & Data Security | 0/? | Not started | - |
| 4. Mobile UX & Performance | 0/? | Not started | - |
| 5. Commerce & Payment | 0/? | Not started | - |
| 6. Community & Content Moderation | 0/? | Not started | - |
| 7. Notifications | 0/? | Not started | - |
| 8. Recommendation Engine | 0/? | Not started | - |
| 9. Quality Engineering | 0/? | Not started | - |
| 10. DevOps & Production Readiness | 0/? | Not started | - |
