# Phase 8: 移动端错误处理与 API 对接 - Research

**Researched:** 2026-04-17
**Status:** Complete

## Research Summary

对移动端代码库进行了全面审计，发现 91 处静默吞错、14 个 Stub 方法、6 个缺少 error 状态的关键 Store、91 处 console.log 残留、以及多处占位符和 mock 数据问题。

---

## 1. 空 catch 块审计（91 处）

### 严重级别 1：完全空的 catch 块（11 处）

| 文件 | 行号 | 上下文 |
|------|------|--------|
| stores/index.ts | 62 | Store 初始化 |
| shared/contexts/ThemeContext.tsx | 158, 183, 200 | 主题加载/保存 |
| contexts/ThemeContext.tsx | 115, 140, 157 | 同上（重复文件） |
| features/tryon/screens/CameraScreen.tsx | 155 | 相机权限 |
| screens/photo/CameraScreen.tsx | 155 | 同上（重复文件） |
| features/tryon/hooks/useCameraPermissions.ts | 79 | 权限请求 |
| hooks/useCameraPermissions.ts | 79 | 同上（重复文件） |

### 严重级别 2：仅含注释的 catch 块（51 处）

**关键区域：**
- `features/*/stores/index.ts` — 旧版 Store 中大量 `// silent fail` / `// non-blocking` 注释
- `features/customization/screens/` — `// handle` / `// silently handle` 明显未完成
- `features/community/` — 关注/点赞/收藏失败静默
- `features/profile/screens/` — 统计/设置加载失败静默

### 严重级别 3：仅含 console 的 catch 块（29 处）

**关键区域：**
- `features/stylist/components/AICompanionProvider.tsx` — 7 处，涉及轮询、语音、会话
- `services/api/client.ts` — token 加载失败仅 console.error
- `shared/utils/imageCache.tsx` — 6 处缓存操作失败
- `features/onboarding/stores/index.ts` — 3 处通知操作失败
- `features/commerce/stores/index.ts` — 2 处优惠券操作失败

---

## 2. Stub 方法审计（14 处）

### 旧版 stores/index.ts 中的 Stub（14 处，当前主入口未导出）

| Store | 方法 | 位置 |
|-------|------|------|
| useWardrobeStore | fetchUserClothing | wardrobe/stores/index.ts:247 |
| useWardrobeStore | fetchOutfits | wardrobe/stores/index.ts:280 |
| useStyleQuizStore | loadQuiz | style-quiz/stores/index.ts:196 |
| useStyleQuizStore | submitQuiz | style-quiz/stores/index.ts:227 |
| useQuizStore | loadQuiz | style-quiz/stores/index.ts:323 |
| useQuizStore | submitQuiz | style-quiz/stores/index.ts:354 |
| useOnboardingStore | submitOnboarding | onboarding/stores/index.ts:266 |
| useChatStore | fetchMessages | consultant/stores/index.ts:185 |
| useChatStore | sendMessage | consultant/stores/index.ts:195 |
| useChatStore | markAsRead | consultant/stores/index.ts:211 |
| useSizeRecommendationStore | fetchRecommendation | commerce/stores/index.ts:108 |
| useOrderStore | fetchOrders | commerce/stores/index.ts:162 |
| useOrderStore | fetchOrderById | commerce/stores/index.ts:172 |
| useOrderStore | cancelOrder | commerce/stores/index.ts:182 |

### "空壳" Store — 仅有 setter，无 API 调用（5 个）

| Store | 文件 | 缺失的方法 |
|-------|------|-----------|
| useWardrobeStore | wardrobeStore.ts | fetchUserClothing, fetchOutfits, incrementWearCount(仅本地) |
| useClothingStore | clothingStore.ts | fetchClothing, fetchFeatured, fetchTrending, fetchNewArrivals |
| useRecommendationStore | recommendation.store.ts | fetchRecommendations, fetchSimilarItems |
| useAnalysisStore | analysis.store.ts | fetchClothingAnalysis, fetchBodyAnalysis |
| useCartStore | cart.store.ts | syncCart, fetchCart |

---

## 3. Store error 状态审计

### 缺少 error 状态的关键 Store（6 个，有异步操作）

| Store | 文件 | loading 状态 | 异步方法数 | 当前错误处理 |
|-------|------|-------------|-----------|------------|
| useOrderStore | orderStore.ts | isLoading | 3 | console.error |
| useCouponStore | couponStore.ts | isLoading | 3 | console.error |
| useNotificationStore | notificationStore.ts | loading, settingsLoading | 6 | console.error |
| useHomeStore | homeStore.ts | isLoadingWeather, isLoadingProfile | 2 | 静默 catch |
| useCustomizationEditorStore | customizationEditorStore.ts | isLoading, isSaving, isLoadingTemplates | 5 | 静默 catch |
| useSizeRecommendationStore | sizeRecommendationStore.ts | isLoading: Record | 1 | console.error |

### 已有 error 状态的 Store（10 个）

useAuthStore, useQuizStore, useClothingStore, usePhotoStore, useAiStylistStore, useProfileStore, useRecommendationFeedStore, useConsultantStore, useChatStore, useBloggerStore

---

## 4. 重复 Store / 文件问题

### 重复 Auth Store
- 旧文件 `src/stores/auth.store.ts` 已删除
- 但 `features/auth/hooks/useAuth.ts` 和 `hooks/useAuth.ts` 仍引用旧路径
- 两个 `useAuth.ts` 文件内容几乎完全相同

### 重复文件（src/ vs src/features/ 或 src/shared/）
- ThemeContext.tsx (2 份)
- CameraScreen.tsx (2 份)
- useCameraPermissions.ts (2 份)
- imageCache.tsx (2 份)
- HeartRecommendScreen.tsx (2 份)
- ScreenErrorBoundaries.ts (2 份)
- offline-cache.ts (2 份)
- performanceMonitor.ts (2 份)
- 多个 screens/ 下的页面文件

---

## 5. Mock 数据静默降级

### HeartRecommendScreen（最严重）
- API 失败时静默回退到 `generateMockProducts()` 生成 8 件假商品
- mock 商品使用 picsum.photos 假图片
- 用户可以对假商品执行喜欢/跳过/加购物车
- 完全无 UI 提示告知用户看到的是假数据

### 其他 Mock 回退
- HomeScreen: 硬编码地理坐标 (35.8617, 104.1954)
- ColorAnalysisScreen: 硬编码色彩回退 + 默认"春季型"
- BodyAnalysisScreen: 默认"矩形"体型
- SwipeCard: picsum.photos 假图片回退
- wechat.ts: Mock 授权码

---

## 6. console.log 残留（91 处，去重后约 45 处独立代码）

**主要来源：**
- ScreenErrorBoundaries.ts: 26 处 onReset 回调
- offline-cache.ts: 6 处缓存操作日志
- performanceMonitor.ts / performanceUtils.ts: 5 处性能日志
- logger.ts: 1 处底层 console.log 调用
- AICompanionProvider.tsx: 1 处发送失败日志
- client.ts: 2 处 API 请求/响应日志
- wechat.ts: 1 处分享日志

---

## 7. 占位符信息

| 文件 | 行号 | 占位符内容 |
|------|------|-----------|
| LegalScreen.tsx (features/) | 92 | 客服电话：400-XXX-XXXX |
| LegalScreen.tsx (features/) | 237 | 客服电话：400-888-XXXX |
| LegalScreen.tsx (features/) | 238 | 邮寄地址：北京市[公司注册地址] |
| LegalScreen.tsx (screens/) | 92, 237, 238 | 同上（重复文件） |

---

## 8. 后端 API 可用性检查

需要确认以下后端 API 是否已实现，以决定前端 Stub 方法的处理方式：

| 前端 Store 方法 | 后端 API 端点 | 需确认状态 |
|----------------|-------------|-----------|
| useWardrobeStore.fetchUserClothing | GET /api/v1/wardrobe/items | 需检查 |
| useClothingStore.fetchFeatured | GET /api/v1/clothing?filter=featured | 需检查 |
| useCartStore.syncCart | POST /api/v1/cart/sync | 需检查 |
| useRecommendationStore.fetchRecommendations | GET /api/v1/recommendations | 需检查 |
| useAnalysisStore.fetchBodyAnalysis | GET /api/v1/profile/body-analysis | 需检查 |

---

## Validation Architecture

### Dimension 1: 功能正确性
- 空 catch 块修复后，error 状态必须正确设置
- Stub 方法连接 API 后，数据流必须完整

### Dimension 2: 用户体验
- 错误提示使用中文
- Toast 提示不阻断用户操作
- Mock 降级时明确标注"示例数据"

### Dimension 3: 安全性
- 错误消息不暴露内部实现细节
- 不在 Toast 中显示 API 路径或堆栈信息

### Dimension 4: 性能
- error state 更新不触发不必要的重渲染
- Toast 组件使用轻量实现

### Dimension 5: 可维护性
- error 状态模式统一（error + setError + clearError）
- 旧版 stores/index.ts 中的 Stub 代码清理

---

## RESEARCH COMPLETE
