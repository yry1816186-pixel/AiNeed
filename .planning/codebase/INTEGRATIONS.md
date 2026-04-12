# Codebase Map: External Integrations

**Mapped:** 2026-04-13
**Project:** AiNeed

## External AI/ML Services

### CatVTON (Virtual Try-On)
- **Endpoint:** `http://localhost:8001` (configurable via `CATVTON_ENDPOINT`)
- **Integration:** `apps/backend/src/modules/try-on/`
- **Protocol:** HTTP REST (form-data with images)
- **Purpose:** AI-powered virtual clothing try-on
- **Config:** `.env.example` -> `CATVTON_ENDPOINT`

### GLM API (Zhipu AI)
- **Integration:** `apps/backend/src/modules/ai/`
- **API Key:** Configured via `GLM_API_KEY` env var
- **Purpose:** AI stylist conversations, content generation
- **Module:** `ai-stylist`, `ai`

### Python ML Services
- **Location:** `ml/inference/`
- **Servers:**
  - `catvton_server.py` - Virtual try-on inference
  - `body_analysis_server.py` - Body shape analysis
  - `sasrec_server.py` - Recommendation model
  - `clothing_segmentation.py` - Garment segmentation
  - `trend_prediction.py` - Fashion trend prediction
  - `outfit_aesthetic_scorer.py` - Outfit scoring
- **Integration:** HTTP REST, called from backend via Axios

### Qdrant Vector Database
- **Client:** `@qdrant/js-client-rest` ^1.17.0
- **Integration:** `apps/backend/src/modules/code-rag/`
- **Purpose:** Code RAG semantic search, code embeddings
- **Collection:** `aineed_code_index`
- **Python indexer:** `ml/services/code_rag/index_cli.py`

## Databases

### PostgreSQL
- **Version:** 16-alpine (Docker)
- **Container:** `stylemind-postgres`
- **Port:** 5432
- **Database:** `stylemind`
- **ORM:** Prisma Client ^5.22.0
- **Schema:** `apps/backend/prisma/schema.prisma`
- **Migrations:** `apps/backend/prisma/migrations/`
- **Connection:** `DATABASE_URL` env var

### Redis
- **Version:** 7-alpine (Docker)
- **Container:** `stylemind-redis`
- **Port:** 6379
- **Client:** ioredis ^5.3.2
- **Purpose:** Session cache, rate limiting, BullMQ queue backend
- **Persistence:** AOF enabled
- **Connection:** `REDIS_URL` env var

## Storage

### MinIO
- **Integration:** `apps/backend/src/common/storage/`
- **Client:** minio ^7.1.3
- **Purpose:** S3-compatible object storage for images, user photos
- **Docker:** Configured in `docker-compose.yml`

## Authentication & Security

### JWT Authentication
- **Library:** @nestjs/jwt ^10.2.0 + passport-jwt ^4.0.1
- **Module:** `apps/backend/src/modules/auth/`
- **Token storage:** `RefreshToken` model in Prisma
- **Flow:** Email/password signup, JWT access + refresh tokens
- **Guards:** `apps/backend/src/common/guards/`

### Encryption
- **AES encryption:** For PII fields (phone, etc.)
- **Password hashing:** bcryptjs
- **CSRF protection:** csurf middleware
- **HTTP security:** Helmet middleware

## Communication

### WebSocket (Socket.IO)
- **Library:** @nestjs/websockets + socket.io ^4.6.1
- **Module:** `apps/backend/src/modules/ws/`
- **Gateway:** `apps/backend/src/common/gateway/`
- **Purpose:** Real-time notifications, live updates

### Email
- **Library:** Nodemailer ^7.0.7
- **Service:** `apps/backend/src/common/email/`
- **Purpose:** Email verification, password reset, notifications

## Monitoring & Observability

### Prometheus
- **Library:** @willsoto/nestjs-prometheus + prom-client
- **Module:** `apps/backend/src/modules/metrics/`
- **Endpoint:** `/metrics`
- **Config:** `monitoring/prometheus/`

### Grafana
- **Dashboards:** `monitoring/grafana/`
- **Purpose:** Metrics visualization

### Alertmanager
- **Config:** `monitoring/alertmanager/`
- **Alerts:** `monitoring/alerts/`

### Sentry (Mobile)
- **Library:** @sentry/react-native 6.9.0
- **Purpose:** Crash reporting, error tracking on mobile

## Background Jobs

### BullMQ
- **Library:** @nestjs/bullmq ^11.0.4 + bullmq ^5.71.0
- **Module:** `apps/backend/src/modules/queue/`
- **Backend:** Redis
- **Purpose:** Async job processing (AI inference, notifications, etc.)

## Mobile Integrations

### React Native Packages
- **Image Picker:** react-native-image-picker ^7.1.0 (photo upload)
- **Share:** react-native-share ^11.0.0 (content sharing)
- **Haptic Feedback:** react-native-haptic-feedback ^2.3.3
- **SVG:** react-native-svg 15.8.0
- **Linear Gradient:** react-native-linear-gradient ^2.8.3
- **NetInfo:** @react-native-community/netinfo 11.5.2 (network status)

---
*Last updated: 2026-04-13*
