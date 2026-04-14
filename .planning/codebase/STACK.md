# Technology Stack

**Analysis Date:** 2026-04-14

## Languages

**Primary:**
- TypeScript 5.7.x - Backend (NestJS), Admin panel (Vite/React), Shared packages
- Python 3.11+ - ML services, algorithm modules, AI inference pipeline

**Secondary:**
- TypeScript 5.0.4 - Mobile app (React Native, pinned version)
- SQL - PostgreSQL schema via Prisma migrations
- YAML - Docker Compose, Prometheus, Grafana configs

## Runtime

**Environment:**
- Node.js 20.11.0 (specified in `.nvmrc`)
- Python 3.11+ (for ML services)
- CUDA (optional, for GPU-accelerated ML inference)

**Package Manager:**
- pnpm 8.15.0 (workspace monorepo)
- Lockfile: `pnpm-lock.yaml` present
- Python: pip with `ml/requirements.txt`

## Frameworks

**Core:**
- NestJS 11.x - Backend API framework with modular architecture
- React Native 0.76.8 (Expo 52) - Mobile app
- React 18.3.1 - Admin panel (Vite + React Router)
- FastAPI 0.100+ - Python ML API service

**Testing:**
- Jest 29.x - Backend unit/integration tests
- Jest 29.x - Mobile tests (run with `--runInBand`)
- pytest-compatible - ML API tests (in `ml/api/tests/`)

**Build/Dev:**
- NestJS CLI - Backend build pipeline
- Vite 6.x - Admin panel bundler
- Metro bundler - React Native
- tsup 8.x - Shared types package bundler
- Prisma 5.x - Database schema and client generation

## Key Dependencies

**Critical (Backend):**
- `@prisma/client` 5.x - ORM for PostgreSQL
- `ioredis` 5.x - Redis client (caching, queues)
- `bullmq` 5.x - Async task queue (backed by Redis)
- `@nestjs/websockets` + `socket.io` 4.x - Real-time communication
- `minio` 7.x - S3-compatible object storage client
- `@qdrant/js-client-rest` 1.x - Vector database client
- `neo4j-driver` 6.x - Graph database client
- `sharp` 0.33.x - Image processing
- `canvas` 3.x - Server-side image rendering
- `zod` 3.x - Runtime schema validation
- `pino` 10.x - Structured logging
- `opossum` 8.x - Circuit breaker pattern

**Critical (Mobile):**
- `zustand` 5.x - State management
- `@tanstack/react-query` 5.x - Server state management
- `react-native-paper` 5.x - Material Design component library
- `socket.io-client` 4.x - WebSocket client
- `@sentry/react-native` 6.x - Error tracking
- `react-native-encrypted-storage` 4.x - Secure storage

**Critical (ML/Python):**
- `torch` 2.0+ / `torchvision` 0.15+ - Deep learning framework
- `transformers` 4.30+ - Hugging Face model loading
- `diffusers` 0.24+ - Diffusion model inference (IDM-VTON)
- `sentence-transformers` 2.2+ - Text embeddings
- `qdrant-client` 1.7+ - Vector DB client (RAG)
- `mediapipe` 0.10+ - Body/face landmark detection
- `opencv-python` 4.8+ - Image processing
- `scikit-learn` 1.3+ - Clustering, ML utilities
- `ultralytics` 8.0+ - YOLO object detection
- `httpx` 0.25+ / `aiohttp` 3.9+ - Async HTTP clients
- `prometheus-client` 0.18+ - Metrics export
- `pydantic` 2.0+ / `pydantic-settings` 2.0+ - Data validation
- `FlagEmbedding` 1.2+ - BGE reranker (RAG)

## Configuration

**Environment:**
- Config validated at startup via `apps/backend/src/common/config/env.validation.ts`
- Pydantic Settings in `ml/api/config.py` for ML service
- Environment files: `.env`, `.env.example`, `.env.local` supported
- Sensitive configs: JWT_SECRET, ENCRYPTION_KEY, GLM_API_KEY, DOUBAO_SEEDREAM_API_KEY

**Build:**
- `apps/backend/tsconfig.json` - NestJS TypeScript config
- `apps/mobile/tsconfig.json` - React Native TypeScript config
- `apps/admin/tsconfig.json` - Vite React TypeScript config
- `.prettierrc` - Shared formatting (semicolons, double quotes, 2-space indent, 100 char width)

## Platform Requirements

**Development:**
- Node.js 20+ (`.nvmrc`: 20.11.0)
- pnpm 8+
- Python 3.11+
- Docker 20.10+ (for PostgreSQL, Redis, MinIO, Neo4j, Qdrant)
- CUDA-capable GPU (optional, for local ML inference)

**Production:**
- Docker Compose orchestrates all services
- Prometheus + Grafana for monitoring (configs in `infrastructure/`)
- Loki + Promtail for log aggregation

---

*Stack analysis: 2026-04-14*
