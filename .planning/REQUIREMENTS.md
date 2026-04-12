# Requirements: AiNeed

**Defined:** 2026-04-13
**Core Value:** 用户能真实体验 AI 虚拟试衣并获得精准的个性化穿搭推荐

## v1 Requirements

Requirements for commercial-grade launch. Each maps to roadmap phases.

### ML Integration

- [ ] **ML-01**: User can upload photo and receive virtual try-on result within 15 seconds
- [ ] **ML-02**: Try-on preserves garment details (logo, pattern, color accuracy)
- [ ] **ML-03**: ML inference has circuit breaker with cloud API fallback when GPU unavailable
- [ ] **ML-04**: All ML calls processed through BullMQ queue with status updates via WebSocket
- [ ] **ML-05**: Try-on results are cached (same photo + garment combo returns cached result)
- [ ] **ML-06**: GPU memory managed with lazy model loading and single-model-at-a-time policy
- [ ] **ML-07**: ML service health check endpoints for monitoring

### AI Stylist

- [ ] **AIS-01**: User can have multi-turn fashion consultation conversation with AI stylist
- [ ] **AIS-02**: AI stylist provides outfit suggestions based on user's style profile and preferences
- [ ] **AIS-03**: AI stylist integrates weather data for weather-appropriate suggestions
- [ ] **AIS-04**: AI stylist conversation history is saved and resumable
- [ ] **AIS-05**: AI content filtered through safety layer before delivery to user

### Recommendations

- [ ] **REC-01**: User receives personalized clothing recommendations based on style profile
- [ ] **REC-02**: "Complete the look" suggestions pair complementary items
- [ ] **REC-03**: New users receive recommendations via onboarding style quiz results
- [ ] **REC-04**: Recommendation engine improves based on user interaction feedback
- [ ] **REC-05**: Color harmony analysis scores outfit compatibility

### Commerce

- [ ] **COMM-01**: User can browse product catalog with filtering by category, price, brand, size
- [ ] **COMM-02**: User can add items to cart with size and color selection
- [ ] **COMM-03**: User can complete checkout with Alipay payment integration
- [ ] **COMM-04**: User can complete checkout with WeChat Pay integration
- [ ] **COMM-05**: User receives order confirmation and can track order status
- [ ] **COMM-06**: User can request refund within policy window
- [ ] **COMM-07**: Merchant can list products with images, pricing, and inventory
- [ ] **COMM-08**: Merchant can manage orders (confirm, ship, complete)
- [ ] **COMM-09**: Merchant dashboard shows sales analytics and key metrics

### Community

- [ ] **SOC-01**: User can post try-on results to community feed with caption
- [ ] **SOC-02**: User can like and comment on community posts
- [ ] **SOC-03**: User can follow other users and see their posts in feed
- [ ] **SOC-04**: AI pre-screening filters inappropriate content before publication
- [ ] **SOC-05**: User can report content for manual review
- [ ] **SOC-06**: Community feed supports infinite scroll with pagination

### Mobile UX

- [ ] **UX-01**: App launches to usable state within 3 seconds
- [ ] **UX-02**: Onboarding flow includes style quiz for profile initialization
- [ ] **UX-03**: Image upload shows progress indicator with retry on failure
- [ ] **UX-04**: All feed screens use lazy loading with skeleton placeholders
- [ ] **UX-05**: Dark and light theme support with smooth transitions
- [ ] **UX-06**: Haptic feedback on key interactions (like, add to cart, purchase)
- [ ] **UX-07**: Offline indicator shown when network unavailable, queued actions sync on reconnect

### Notifications

- [ ] **NOTIF-01**: User receives push notification for order status changes
- [ ] **NOTIF-02**: User receives push notification for community interactions (likes, comments, follows)
- [ ] **NOTIF-03**: User can configure notification preferences per category
- [ ] **NOTIF-04**: In-app notification center shows all notifications with read/unread state

### Privacy & Security

- [ ] **SEC-01**: User photos encrypted at rest with per-user encryption key
- [ ] **SEC-02**: Body measurement data encrypted and never exposed in API responses
- [ ] **SEC-03**: EXIF data stripped from uploaded images
- [ ] **SEC-04**: API rate limiting configured per endpoint group
- [ ] **SEC-05**: File upload validation (MIME type check, size limits, malware scan)
- [ ] **SEC-06**: User consent flow for photo and body data processing
- [ ] **SEC-07**: Auto-deletion policy for expired try-on results

### Quality Engineering

- [ ] **QA-01**: Backend unit test coverage >= 80% for all modules
- [ ] **QA-02**: Integration tests for critical flows (auth, try-on, payment, order)
- [ ] **QA-03**: E2E tests for mobile core user journey
- [ ] **QA-04**: API contract tests ensure backward compatibility
- [ ] **QA-05**: Performance benchmarks for key API endpoints (try-on < 15s, feed < 500ms)
- [ ] **QA-06**: CI pipeline blocks merge on test failure

### DevOps & Monitoring

- [ ] **OPS-01**: Sentry error tracking on backend (unified with mobile Sentry)
- [ ] **OPS-02**: Structured logging with request correlation IDs
- [ ] **OPS-03**: Custom Prometheus metrics for ML inference latency and success rate
- [ ] **OPS-04**: Grafana dashboards for business metrics (try-ons/day, conversion rate)
- [ ] **OPS-05**: Automated deployment pipeline with rollback capability
- [ ] **OPS-06**: Database backup and recovery procedures documented and tested

## v2 Requirements

Deferred to future release.

### Advanced AI

- **AIS-V2-01**: Multi-angle virtual try-on (front, side, back)
- **AIS-V2-02**: Video try-on capability
- **AIS-V2-03**: Body measurement estimation from photos
- **AIS-V2-04**: Celebrity/style icon matching

### Advanced Commerce

- **COMM-V2-01**: Subscription box (curated monthly picks)
- **COMM-V2-02**: Loyalty points system
- **COMM-V2-03**: AI-powered size recommendation
- **COMM-V2-04**: Style challenge/competition system

### Platform

- **PLAT-V2-01**: Merchant API for third-party integration
- **PLAT-V2-02**: Web version of the platform
- **PLAT-V2-03**: Internationalization (English support)
- **PLAT-V2-04**: A/B testing framework for ML models

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time AR try-on | Hardware-dependent, premature for v1 |
| 3D body scanning | Over-engineered, expensive |
| Cryptocurrency payment | Not mainstream in target market |
| Real-name verification | Too much friction for v1 |
| GraphQL API | REST + Swagger sufficient |
| Microservices migration | Modular monolith adequate until scale demands otherwise |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| ML-01 through ML-07 | Phase 1 | Pending |
| AIS-01 through AIS-05 | Phase 1 | Pending |
| SEC-01 through SEC-07 | Phase 2 | Pending |
| UX-01 through UX-07 | Phase 3 | Pending |
| COMM-01 through COMM-09 | Phase 4 | Pending |
| SOC-01 through SOC-06 | Phase 5 | Pending |
| NOTIF-01 through NOTIF-04 | Phase 5 | Pending |
| REC-01 through REC-05 | Phase 6 | Pending |
| QA-01 through QA-06 | Phase 7 | Pending |
| OPS-01 through OPS-06 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 47 total
- Mapped to phases: 47
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-13*
*Last updated: 2026-04-13 after initial definition*
