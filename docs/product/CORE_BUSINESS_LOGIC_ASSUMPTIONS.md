# CORE_BUSINESS_LOGIC_ASSUMPTIONS.md

## Product Catalog

- **Real product count**: 0 (no commercial catalog imported)
- **Research data**: 44,424 items from HuggingFace fashion-dataset (research only)
- **Demo products**: 106 hand-crafted items for UI
- **No live inventory**: All stock/availability fields are null or mock
- **No real prices**: Price data marked as missing in source
- **No SKU system**: Not implemented

## Commerce Flow

- **Cart**: Implemented in backend (Prisma model + API), frontend has TODO stubs
- **Checkout**: API endpoint exists, but no payment gateway integration operational
- **Payment**: Alipay/WeChat integration code exists, but requires real merchant credentials
- **Order management**: Backend model exists, no real order processing pipeline
- **Refund**: API skeleton exists, not tested with real payments

## AI Features

- **AI Stylist**: Real GLM-4.5 LLM integration via AIServiceRouter
- **Virtual Try-On**: API endpoint exists, requires third-party image generation service
- **Body Analysis**: MediaPipe-based, requires uploaded photos
- **Recommendations**: SASRec model + RAG hybrid retrieval, but uses demo/research data
- **All AI features**: Now require explicit user consent

## User Authentication

- Email/password registration
- Phone/SMS login (requires Alibaba Cloud SMS)
- WeChat OAuth (requires WeChat developer account)
- WeChat Mini Program auth (separate flow)
- JWT with refresh token rotation
- Account lockout after 5 failed attempts

## Subscription/Tiers

- **Free tier**: Basic features
- **Premium tier**: AI features, unlimited recommendations
- **Subscription model**: Backend model exists, not integrated with real payment
- **Feature gating**: AiQuotaGuard limits free tier usage

## Social Features

- Community feeds (posts, comments, likes)
- Outfit sharing
- Blogger/KOL profiles
- Consultant booking (not operational)
- Real-time chat (WebSocket infrastructure exists)

## Blocks Requiring External Dependencies

| Feature | Blocker |
|---------|---------|
| Real product catalog | No supplier API, no commercial data source |
| Payments | Alipay/WeChat merchant accounts required |
| SMS verification | Alibaba Cloud SMS account required |
| WeChat login | WeChat Open Platform developer account required |
| Virtual try-on (image generation) | Third-party AI image generation API required |
| Consultant monetization | Business model not defined |
| Production deployment | Infrastructure not provisioned |

## Honest Status

This project has comprehensive **architectural scaffolding** for a commercial fashion platform but lacks **operational commercial integrations**. The AI features are real (LLM-based styling, CLIP fine-tuning, recommendation models) but operate on research/demo data. Commerce features exist as API contracts without live payment/supplier integrations.
