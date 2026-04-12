# Research: Stack — AI Fashion Platform (Commercial Grade)

**Researched:** 2026-04-13

## Current Stack Assessment

The existing stack is solid for a prototype but needs specific additions for commercial production.

### What's Already Good
- NestJS 11 + Prisma 5 + PostgreSQL 16 — production-ready backend stack
- React Native 0.76 + Zustand + TanStack Query — modern mobile architecture
- BullMQ + Redis — reliable job processing
- Prometheus + Grafana — observability foundation
- K8s manifests — deployment ready

### What's Missing for Commercial Grade

| Category | Recommendation | Rationale | Confidence |
|----------|---------------|-----------|------------|
| **API Rate Limiting** | @nestjs/throttler (already installed ^6.5.0) | Need to configure per-endpoint limits | High |
| **File Upload Validation** | Sharp (installed) + file-type detection | Prevent malicious file uploads | High |
| **Image CDN** | Cloudflare Images or similar | Fast image delivery for fashion content | Medium |
| **Push Notifications** | Firebase Cloud Messaging (FCM) | Mobile push for engagement | High |
| **Payment Gateway** | Stripe / Alipay / WeChat Pay | Chinese market requires Alipay/WeChat | High |
| **A/B Testing** | Custom or LaunchDarkly | ML model and feature experimentation | Medium |
| **Error Boundary** | Sentry (mobile installed), need backend Sentry | Unified error tracking | High |
| **Log Aggregation** | ELK or Loki (already have Grafana) | Centralized logging for production | Medium |
| **API Documentation** | Swagger (installed) — needs completion | Developer onboarding, merchant API | High |
| **CI/CD Pipeline** | GitHub Actions (exists) — needs test gates | Automated quality enforcement | High |
| **E2E Testing Mobile** | Detox or Maestro | Mobile E2E automation | Medium |
| **Security Scanning** | Snyk or npm audit in CI | Dependency vulnerability detection | High |

### ML Serving Improvements

| Need | Current | Recommendation |
|------|---------|---------------|
| Model versioning | None | MLflow or custom version tracking |
| Inference fallback | None | Fallback to API when local GPU fails |
| Latency monitoring | None | Custom Prometheus metrics per model |
| Batch inference | None | BullMQ worker for batch try-on jobs |
| Model warmup | None | Startup warmup script for ML servers |

### Do NOT Use
- **GraphQL** — REST with Swagger is sufficient, don't add complexity
- **Microservices** — Modular monolith is fine until scale demands otherwise
- **WebRTC** — Not needed for this application
- **Blockchain** — No legitimate use case here

---
*Last updated: 2026-04-13*
