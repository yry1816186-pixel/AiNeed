# AiNeed (StyleMind) - GitHub Copilot Instructions

## Project Overview
AiNeed is an AI-powered personal fashion styling and virtual try-on assistant platform.
Tech stack: NestJS backend + React Native (Expo) mobile app + Python ML services + GLM-5 LLM.

## Architecture (Monorepo)
```
AiNeed/
├── apps/backend/     # NestJS 11.x (port 3001) - Prisma, PostgreSQL, Redis, JWT
├── apps/mobile/      # React Native 0.76.8 / Expo 52 (Metro port 8081)
├── ml/               # Python AI services (CatVTON, RAG, hallucination detection)
├── packages/types/   # Shared TypeScript types
└── k8s/              # Kubernetes deployment configs
```

## Key Conventions

### Backend (NestJS)
- Module pattern: `src/modules/{name}/{name}.module.ts`
- Prisma ORM: `apps/backend/prisma/schema.prisma` (49 tables)
- API prefix: `/api/v1/`
- Guards: JWT auth (`JwtAuthGuard`), Roles (`RolesGuard`)
- Common: `src/common/guards/`, `src/common/filters/`, `src/common/middleware/`
- Environment: `.env` file (GLM API key, DB credentials)

### Mobile (React Native)
- Navigation: React Navigation (Stack + Bottom Tabs, 6 tabs: Home/Explore/Heart/Cart/Wardrobe/Profile)
- State: Zustand stores in `src/stores/`
- API layer: `src/services/`
- UI: React Paper components
- Config: `src/config/runtime.ts`
- **Do NOT upgrade**: react-native-screens 4.4.0, reanimated 3.16.7, svg 15.8.0

### ML/Python (ml/)
- CatVTON server: `ml/inference/catvton_server.py` (port 8001)
- RAG system: `ml/services/rag/` (BM25 + Vector hybrid retrieval with Qdrant)
- Embeddings: FashionCLIP (512d) + sentence-transformers (384d)
- Vector DB: Qdrant (port 6333)
- Hallucination detection: `ml/services/hallucination/` (50+ rules)

## Critical Constraints
- GPU: RTX 4060 8GB VRAM only (~4GB used by CatVTON)
- Database host: use `127.0.0.1` not `localhost` (IPv6 issue)
- CLIP loading: must use `use_safetensors=True`
- xformers cannot be installed (version conflict)
- TryOn polling timeout: 180s (60 iterations × 3s)

## Security Rules
- Never commit secrets (.env files, API keys)
- PII fields encrypted with AES-256-GCM
- JWT: 512-bit strong random key, bcrypt 12 rounds
- API rate limiting: 100 req/min/IP via @nestjs/throttler

## Current Status (Score: 78/100)
- All APIs functional: Auth, AI-Stylist, Recommendations, Clothing, Try-On
- CatVTON running on port 8001
- GLM-5 configured for AI stylist conversations
- Tech debt: 226 `any` types in backend, 105 in mobile
- Test coverage: ~15% backend, ~5% mobile (target: 60%+)

## Testing Account
- Email: test@example.com / Password: Test123456!

## Common Commands
```bash
# Backend
cd apps/backend && pnpm dev          # Start dev server (:3001)

# Mobile
cd apps/mobile && npx react-native start --port 8081  # Metro bundler

# CatVTON (requires Python venv)
cd ml && .\venv\Scripts\activate
$env:CATVTON_REPO_PATH="C:\AiNeed\models\CatVTON"
$env:HF_ENDPOINT="https://hf-mirror.com"
python .\inference\catvton_server.py    # Start (:8001)

# Database
cd apps/backend && npx prisma db push   # Push schema
cd apps/backend && npx tsx prisma/seed.ts  # Seed data
```

## When Working on This Project
1. Check `CLAUDE.md` in root for full project documentation
2. Follow existing module patterns when creating new features
3. Use Prisma for all database operations (no raw SQL)
4. Keep files under 800 lines (already split large files)
5. Run lint/typecheck after changes if commands are available
