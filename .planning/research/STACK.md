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

## Payment SDK (Web Search 2026-04-13)

### Alipay
- **npm package**: `alipay-sdk`
- **Sandbox**: Available at openhome.alipay.com
- **Sandbox gateway**: `https://openapi-sandbox.dl.alipaydev.com/gateway.do`
- **Note**: V3 API migration underway, but Node.js SDK primarily uses V2 signing
- **Key flow**: SDK init → create order (`alipay.trade.page.pay`) → callback verification

### WeChat Pay
- **npm package**: `wechatpay-node-v3` (V3 API, TypeScript support)
- **CRITICAL**: Sandbox was **deprecated in 2021** — use small real transactions (0.01 CNY) for testing
- **Key flow**: SDK init → JSAPI/APP prepay → callback signature verification

### Implementation Notes
- Store private keys in env vars only, never hardcode
- Both platforms support async callback notifications with signature verification
- Refund APIs available on both platforms

## ML Model Landscape (Web Search 2026-04-13)

### Virtual Try-On Models Comparison

| Model | Params | Backbone | VRAM Need | Key Feature | Source |
|-------|--------|----------|-----------|-------------|--------|
| **CatVTON** | 899M (49.5M trainable) | SD 1.5 | ~6-8GB | Lightweight, ICLR 2025 | [GitHub](https://github.com/Zheng-Chong/CatVTON) |
| **IDM-VTON** | Diffusion-based | Custom | ~8-10GB | High garment fidelity | [Official](https://idm-vton.github.io/) |
| **Kolors Virtual Try-On** | Diffusion-based | Kolors | ~10-12GB | Kuaishou's latest | CSDN |
| **CatVTON-Flux** | Flux-based | Flux | ~16GB+ | SOTA FID 5.59 on VITON-HD | nftblackmagic |
| **Mobile-VTON** | Lightweight | Custom | Mobile-friendly | On-device inference (2025) | [arXiv](https://arxiv.org/html/2603.00947v1) |

### RTX 4060 (8GB) Implications
- **CatVTON (SD 1.5)**: Should work — SD 1.5 backbone is VRAM-friendly for 8GB
- **CatVTON-Flux**: Too heavy — needs 16GB+
- **IDM-VTON**: Borderline — may need optimizations (xformers, FP16)
- **Kolors**: Likely too heavy for 8GB without heavy optimization
- **Recommendation**: Start with base CatVTON, consider OpenVINO optimization for consumer GPU
- **No published RTX 4060 benchmarks found** — need to measure in-house

### Fallback Strategy
- Local CatVTON (SD 1.5) as primary — should fit RTX 4060
- Cloud API (Kolors/IDM-VTON) as fallback via circuit breaker
- Queue-based processing to handle GPU contention

---
*Last updated: 2026-04-13 after web search supplement*
