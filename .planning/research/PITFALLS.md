# Research: Pitfalls — AI Fashion Platform (Commercial Grade)

**Researched:** 2026-04-13

## Critical Pitfalls

### 1. ML Inference Latency Kills UX
- **Warning sign:** Try-on takes > 15 seconds, users abandon
- **Prevention:** Queue-based processing with WebSocket status updates, show progress indicator
- **Phase:** ML integration phase

### 2. GPU Memory Exhaustion
- **Warning sign:** OOM errors on RTX 4060 when multiple models loaded
- **Prevention:** Model lazy loading, single-model-at-a-time policy, cloud API fallback
- **Phase:** ML integration phase

### 3. Image Upload Security Hole
- **Warning sign:** Users can upload arbitrary files disguised as images
- **Prevention:** Validate MIME type server-side, strip EXIF data, limit file size
- **Phase:** Security hardening phase

### 4. Payment Integration Underestimated
- **Warning sign:** Payment module is just structure, no real gateway connected
- **Prevention:** Start with Alipay sandbox early, handle edge cases (refund, partial refund, timeout)
- **Phase:** Commerce phase

### 5. Body Data Privacy Violation
- **Warning sign:** Body measurements/photos stored without explicit consent or in plain text
- **Prevention:** Encryption at rest, consent flow, auto-deletion policy, audit log
- **Phase:** Security/privacy phase

### 6. Mobile Performance Regression
- **Warning sign:** App becomes sluggish after adding AI features, especially on older devices
- **Prevention:** Performance profiling per screen, lazy loading, image optimization
- **Phase:** UX polish phase

### 7. Content Moderation Gap
- **Warning sign:** Inappropriate user content visible in community feed
- **Prevention:** AI pre-screening + manual review queue + user reporting system
- **Phase:** Community phase

### 8. Test Coverage Theater
- **Warning sign:** Tests pass but app breaks in real usage
- **Prevention:** Integration tests for critical flows (auth, try-on, payment), E2E for mobile
- **Phase:** Quality engineering phase

### 9. Recommendation Cold Start
- **Warning sign:** New users get irrelevant recommendations
- **Prevention:** Style quiz during onboarding, popular items fallback, collaborative filtering seed
- **Phase:** AI recommendation phase

### 10. Deployment Without Runbook
- **Warning sign:** Production issues but no one knows how to diagnose/fix
- **Prevention:** Document every service's health check, common failure modes, rollback procedures
- **Phase:** DevOps phase

---
*Last updated: 2026-04-13*
