# Phase 1 推迟的命名规范问题

## 1. 移动端 Store 命名不一致

**推迟到**: Phase 5（移动端页面重组）

**现状**:
- 点号风格: auth.store.ts, user.store.ts, app.store.ts, cart.store.ts, analysis.store.ts, heart-recommend.store.ts, recommendation.store.ts
- 驼峰风格: uiStore.ts, clothingStore.ts, photoStore.ts, orderStore.ts, couponStore.ts

**建议**: Phase 5 统一为驼峰风格（uiStore.ts, authStore.ts 等），与 React 社区惯例一致。

## 2. API 端点路径不一致

**推迟到**: Phase 3/4（后端域划分完成后统一路由）

**现状**:
- merchant vs merchants
- wardrobe-collections vs wardrobe/collections
- style-quiz vs quiz

**详情**: 参见 API-CONSISTENCY-FIX.md

**建议**: 域划分完成后，按域统一 RESTful 路由命名。
