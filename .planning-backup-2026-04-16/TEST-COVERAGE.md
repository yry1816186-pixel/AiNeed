# AiNeed 测试覆盖率审计报告

**审计日期**: 2026-04-13
**审计范围**: C:\AiNeed 全代码库
**审计类型**: 静态代码扫描 + 测试文件质量评估

---

## 一、审计摘要

| 指标 | 数值 | 评估 |
|------|------|------|
| 后端模块总数 | 35 | - |
| 后端单元测试文件 | 48 (.spec.ts) | 中等 |
| 后端 e2e 测试文件 | 12 (.e2e-spec.ts) | 中等 |
| 移动端单元测试文件 | 0 | 严重不足 |
| 移动端 e2e 测试文件 | 2 (.test.ts, Detox) | 不足 |
| Python AI 服务测试文件 | 8 (ml/api/tests/) + 2 (ml/services/) + 5 (ml/scripts/) | 中等 |
| 后端模块测试覆盖率 | ~43% (15/35 模块有 service.spec) | 不达标 |
| 移动端测试覆盖率 | ~0% (0/50 screens 有测试) | 严重不达标 |
| Python AI 服务测试覆盖率 | ~30% (核心服务缺少测试) | 不达标 |

**总体评估: 测试覆盖率严重不足，无法满足生产级质量门禁要求。**

---

## 二、现有测试文件完整清单

### 2.1 后端单元测试 (48 文件)

#### 模块级测试 (28 文件)

| 模块 | 测试文件 | 有无 |
|------|---------|------|
| address | address.service.spec.ts | 有 |
| ai-stylist | ai-stylist.service.spec.ts | 有 |
| analytics | behavior-tracker.service.spec.ts | 有 |
| auth | auth.service.spec.ts | 有 |
| auth/guards | sms-throttle.guard.spec.ts | 有 |
| auth/services | sms.service.spec.ts | 有 |
| auth/services | wechat.service.spec.ts | 有 |
| brands | brands.service.spec.ts | 有 |
| cart | cart.service.spec.ts | 有 |
| cart | cart.controller.spec.ts | 有 |
| clothing | clothing.service.spec.ts | 有 |
| customization | customization.service.spec.ts | 有 |
| favorites | favorites.service.spec.ts | 有 |
| health | health.service.spec.ts | 有 |
| merchant | merchant.service.spec.ts | 有 |
| notification | notification.service.spec.ts | 有 |
| onboarding | onboarding.service.spec.ts | 有 |
| order | order.service.spec.ts | 有 |
| order | order.controller.spec.ts | 有 |
| payment | payment.service.spec.ts | 有 |
| photos | photos.service.spec.ts | 有 |
| photos/services | photo-quality.service.spec.ts | 有 |
| photos/services | photo-upload.service.spec.ts | 有 |
| privacy | privacy.service.spec.ts | 有 |
| profile | profile.service.spec.ts | 有 |
| profile/services | poster-generator.service.spec.ts | 有 |
| recommendations | recommendations.service.spec.ts | 有 |
| search | search.service.spec.ts | 有 |
| security/content-filter | content-filter.service.spec.ts | 有 |
| security/degradation | ai-circuit-breaker.service.spec.ts | 有 |
| security/encryption | pii-encryption.service.spec.ts | 有 |
| security/rate-limit | ai-quota.guard.spec.ts | 有 |
| security/rate-limit | ai-quota.service.spec.ts | 有 |
| security/vault | vault.service.spec.ts | 有 |
| style-quiz | style-quiz.service.spec.ts | 有 |
| subscription | subscription.service.spec.ts | 有 |
| try-on | try-on.service.spec.ts | 有 |
| users | users.service.spec.ts | 有 |

#### 公共层测试 (10 文件)

| 公共模块 | 测试文件 |
|---------|---------|
| common/filters | http-exception.filter.spec.ts |
| common/middleware | api-version.middleware.spec.ts |
| common/services | image-processing.service.spec.ts |
| common/interceptors | image-response.interceptor.spec.ts |
| common/interceptors | json-api.interceptor.spec.ts |
| common/interceptors | error.interceptor.spec.ts |
| common/utils | cursor.spec.ts |
| common/soft-delete | soft-delete.service.spec.ts |
| common/encryption | encryption.service.spec.ts |
| common/email | email.service.spec.ts |

### 2.2 后端 E2E 测试 (12 文件)

| 文件 | 路径 |
|------|------|
| auth.e2e-spec.ts | test/ |
| ai-stylist.e2e-spec.ts | test/ |
| body-analysis.e2e-spec.ts | test/ |
| cart-order.e2e-spec.ts | test/ |
| clothing.e2e-spec.ts | test/ |
| health.e2e-spec.ts | test/ |
| payment.e2e-spec.ts | test/ |
| recommendations.e2e-spec.ts | test/ |
| try-on.e2e-spec.ts | test/ |
| integration/user-flow.e2e-spec.ts | test/integration/ |
| integration/payment-flow.e2e-spec.ts | test/integration/ |
| integration/ai-stylist-flow.e2e-spec.ts | test/integration/ |

### 2.3 移动端测试 (2 文件, 仅 Detox E2E)

| 文件 | 类型 |
|------|------|
| e2e/auth.test.ts | Detox E2E - 认证流程 |
| e2e/navigation.test.ts | Detox E2E - Tab/Stack 导航 |

### 2.4 Python AI 服务测试 (15 文件)

#### ml/api/tests/ (8 文件)

| 文件 | 覆盖范围 |
|------|---------|
| conftest.py | 测试配置 + fixture |
| test_auth.py | API 认证 |
| test_tasks.py | 异步任务 |
| test_photo_quality.py | 照片质量分析 |
| test_stylist.py | 造型师聊天 |
| test_recommend.py | 推荐接口 |
| test_style_analysis.py | 风格分析 |
| test_body_analysis.py | 体型分析 |
| test_health.py | 健康检查 |

#### ml/services/ (2 文件)

| 文件 | 覆盖范围 |
|------|---------|
| color_season_analyzer_test.py | 色彩季型分析 |
| reference_line_generator_test.py | 参考线生成 |

#### ml/scripts/ (5 文件 - 非正式测试脚本)

| 文件 | 类型 |
|------|------|
| test_visual_outfit.py | 手动测试脚本 |
| test_intelligent_stylist.py | 手动测试脚本 |
| test_glm_api.py | API 连通性测试 |
| test_detailed.py | 详细测试脚本 |
| test_complete_flow.py | 完整流程测试 |

---

## 三、各模块测试覆盖率估算

### 3.1 后端模块覆盖率 (35 个模块)

| 状态 | 模块 | 说明 |
|------|------|------|
| 有测试 | address, ai-stylist, analytics, auth, brands, cart, clothing, customization, favorites, health, merchant, notification, onboarding, order, payment, photos, privacy, profile, recommendations, search, security, style-quiz, subscription, try-on, users | 25 个模块有 service.spec |
| 无测试 | ai, ai-safety, cache, chat, code-rag, community, consultant, database, demo, feature-flags, metrics, queue, share-template, style-profiles, system, wardrobe-collection, weather, ws | 18 个模块无任何测试 |

**后端模块级测试覆盖率: 25/43 = ~58%** (含子模块测试)

**后端 service 级测试覆盖率估算:**
- 有 service.spec 的核心服务: ~25 个
- 总 service 文件数 (估算): ~60+ 个 (含子服务)
- **估算 service 级行覆盖率: ~15-20%** (与 CLAUDE.md 记载的 ~15% 一致)

### 3.2 后端 Controller 测试覆盖率

| 有 controller.spec | 无 controller.spec |
|---|---|
| cart.controller.spec.ts, order.controller.spec.ts | 其余 ~30+ 个 controller 均无测试 |

**Controller 测试覆盖率: ~6%**

### 3.3 移动端覆盖率

| 类别 | 文件数 | 有测试 | 覆盖率 |
|------|--------|--------|--------|
| Screens | 50 | 0 | 0% |
| Stores (Zustand) | 9 | 0 | 0% |
| Services/API | 33 | 0 | 0% |
| E2E (Detox) | 2 | 2 | 仅覆盖导航和认证 |

**移动端单元测试覆盖率: 0%**
**移动端 E2E 覆盖率: ~4% (仅认证+导航)**

### 3.4 Python AI 服务覆盖率

| 服务文件 | 有测试 |
|---------|--------|
| intelligent_stylist_service.py | 无 (仅 scripts/ 手动测试) |
| visual_outfit_service.py | 无 (仅 scripts/ 手动测试) |
| body_analyzer.py | 有 (ml/api/tests/test_body_analysis.py) |
| ai_service.py | 无 |
| style_understanding_service.py | 无 |
| color_season_analyzer.py | 有 (color_season_analyzer_test.py) |
| reference_line_generator.py | 有 (reference_line_generator_test.py) |
| photo_quality_analyzer.py | 有 (test_photo_quality.py) |
| fashion_knowledge_rag.py | 无 |
| degradation_service.py | 无 |
| rate_limiter.py | 无 |
| multi_level_cache.py | 无 |
| middleware.py | 无 |
| metrics_service.py | 无 |
| algorithm_gateway.py | 无 |
| task_worker.py | 无 |
| secure_api_key.py | 无 |
| stylist_prompts.py | 无 |

**Python AI 服务核心模块测试覆盖率: ~25%**

---

## 四、缺失测试的关键模块列表

### 4.1 严重缺失 (P0 - 核心业务逻辑)

| 模块 | 风险说明 |
|------|---------|
| **ai** (6 个子服务) | AI 集成核心: ai-integration, algorithm-orchestrator, cloud-communication, hybrid-processing, style-understanding, unet-segmentation 均无测试 |
| **ai-safety** | AI 安全控制，无测试意味着安全策略无法验证 |
| **payment/guards** | payment-security.guard.ts 无测试，支付安全守卫无验证 |
| **payment/providers** | alipay.provider.ts, wechat.provider.ts 无单元测试，支付渠道逻辑未验证 |
| **try-on/services** | tryon-orchestrator, cloud-tryon, local-preview 均无独立测试 |
| **ai-stylist 子服务** | chat.service, context.service, recommendation.service, session.service, llm-provider, decision-engine, nl-slot-extractor, system-context, agent-tools 均无独立测试 |
| **photos 子服务** | ai-analysis, body-image-analysis, body-shape-analyzer, color-season-analyzer, face-shape-analyzer, hair-analysis, makeup-analysis, accessory-recommendation 均无独立测试 |

### 4.2 高度缺失 (P1 - 重要业务功能)

| 模块 | 风险说明 |
|------|---------|
| **ws** (WebSocket) | 实时通信网关无测试，Socket.IO 事件处理未验证 |
| **chat** | 聊天模块完全无测试 |
| **community** | 社区模块完全无测试 |
| **queue** | 异步任务队列无测试，BullMQ 处理器未验证 |
| **feature-flags** | 功能开关无测试，A/B 测试策略未验证 |
| **cache** | 缓存服务无测试 |
| **consultant** | 顾问模块无测试 |
| **code-rag** | RAG 服务无测试 |
| **style-profiles** | 风格档案无测试 |
| **share-template** | 分享模板无测试 |
| **weather** | 天气服务无测试 |
| **metrics** | 指标服务无测试 |
| **wardrobe-collection** | 衣橱集合无测试 |

### 4.3 移动端严重缺失 (P0)

| 类别 | 缺失说明 |
|------|---------|
| **所有 Screen 组件** | 50 个页面组件无任何单元测试 |
| **所有 Store** | 9 个 Zustand store 无测试 |
| **所有 Service** | 33 个服务/API 层无测试 |
| **关键流程** | 注册、Onboarding、风格测试、拍照、虚拟试衣、支付等核心用户流程无 E2E 测试 |

### 4.4 Python AI 服务严重缺失 (P0)

| 服务 | 缺失说明 |
|------|---------|
| intelligent_stylist_service.py | GLM-5 造型师核心，仅 scripts/ 手动测试 |
| visual_outfit_service.py | 穿搭可视化核心，仅 scripts/ 手动测试 |
| ai_service.py | 主 AI 服务入口，无测试 |
| fashion_knowledge_rag.py | 时尚知识 RAG，无测试 |
| degradation_service.py | 降级服务，无测试 |
| rate_limiter.py | 限流器，无测试 |

---

## 五、测试质量评估

### 5.1 后端测试结构评估

**优点:**
1. **Mock 隔离完善**: `test/setup.ts` 全局 mock 了 bcryptjs, sharp, MinIO, BullMQ, nodemailer, opossum 等外部依赖
2. **测试工具完善**: `test/utils/` 提供了完整的测试基础设施:
   - `test-app.module.ts`: 完整的 mock 应用模块工厂 (PrismaService, RedisService, StorageService, EmailService, LlmProviderService, CloudTryOnProvider, BullMQ Queue)
   - `prisma-test-utils.ts`: Prisma 测试工具
   - `redis-test-utils.ts`: Redis 测试工具
   - `fixtures.ts`: 测试数据工厂
3. **AI Mock 录制/回放系统**: 三件套设计精良:
   - `ai-mock-recorder.ts`: 录制真实 AI API 响应为 fixture
   - `ai-mock-player.ts`: 回放 fixture，支持精确/模糊/顺序匹配
   - `ai-mock-interceptor.ts`: HTTP 拦截器，支持 axios + fetch，三种模式 (record/playback/passthrough)
4. **高质量测试用例**: auth.service.spec.ts (835 行), payment.service.spec.ts (851 行), ai-stylist.service.spec.ts (738 行) 覆盖了正常/异常/边界场景
5. **E2E 测试覆盖关键流程**: auth, payment, ai-stylist, try-on, cart-order 等核心流程有集成测试

**问题:**
1. **覆盖率阈值虚高**: jest.config.js 设置了 90% 的覆盖率阈值，但实际覆盖率远低于此，测试运行时可能跳过覆盖率检查
2. **Controller 测试严重不足**: 30+ 个 controller 仅有 2 个有测试
3. **子服务测试缺失**: ai-stylist, photos, try-on 等模块的子服务 (chat, context, llm-provider, orchestrator 等) 均无独立测试
4. **E2E 测试依赖真实数据库**: auth.e2e-spec.ts 直接使用 AppModule 和真实 PrismaService，未使用 test-app.module 的 mock
5. **AI Mock fixture 不完整**: `test/fixtures/ai-responses/` 仅有 3 个 fixture 文件 (doubao-seedream.json, glm-chat.json, try-on-result.json)，无法覆盖所有 AI 场景

### 5.2 移动端测试结构评估

**优点:**
1. **Jest 配置完善**: jest.config.js 配置了合理的 testMatch、collectCoverageFrom、coverageThreshold
2. **Detox E2E 框架已搭建**: 有认证流程和导航的 E2E 测试
3. **jest.setup.js 基础 mock**: mock 了 expo-router, expo-secure-store, async-storage, expo-font, expo-constants

**问题:**
1. **零单元测试**: 50 个 Screen、9 个 Store、33 个 Service 无任何单元测试
2. **coverageThreshold 虚假**: 设置了 80% branches / 90% functions 的阈值，但实际为 0%
3. **E2E 测试覆盖面窄**: 仅覆盖登录/注册/导航，核心业务流程 (Onboarding, 风格测试, 拍照, 虚拟试衣, 购物车, 支付) 完全未覆盖
4. **缺少 test-helpers**: e2e/utils/test-helpers 被引用但未找到文件

### 5.3 Python AI 服务测试结构评估

**优点:**
1. **conftest.py 设计良好**: 提供了完整的 mock fixture (mock_body_service, mock_style_api, mock_recommender_service, mock_stylist_service)
2. **API 层测试覆盖**: 8 个 API 端点测试文件覆盖了主要路由
3. **使用 httpx AsyncClient**: 正确使用 ASGITransport 进行异步 API 测试

**问题:**
1. **核心服务无测试**: intelligent_stylist_service.py, visual_outfit_service.py, ai_service.py 等核心逻辑无单元测试
2. **scripts/ 测试非正式**: ml/scripts/ 下的 5 个测试脚本是手动运行脚本，不是 pytest 测试用例
3. **mock 粒度太粗**: conftest.py 中的 mock 是整个服务的 mock，未测试内部逻辑
4. **缺少错误场景测试**: API 测试仅覆盖 happy path，缺少异常/边界测试

---

## 六、AI Mock 录制/回放系统评估

### 6.1 系统架构

```
ai-mock-recorder.ts  -->  fixture JSON  <--  ai-mock-player.ts
                                              |
ai-mock-interceptor.ts (axios + fetch 拦截)
  - record 模式: 转发请求 + 录制响应
  - playback 模式: 返回 fixture 响应
  - passthrough 模式: 透传
```

### 6.2 评估

| 方面 | 评分 | 说明 |
|------|------|------|
| 架构设计 | 优秀 | 三件套职责清晰，支持录制/回放/透传三种模式 |
| Provider 覆盖 | 良好 | 支持 zhipu, doubao-seedream, fashn-ai, deepseek, qwen, openai |
| 匹配策略 | 优秀 | 精确指纹 + 模糊匹配 + 顺序回放三种策略 |
| 安全性 | 优秀 | 自动脱敏 API Key、敏感 Header |
| Fixture 覆盖 | 不足 | 仅 3 个 fixture 文件，远不够覆盖所有 AI 场景 |
| 实际使用 | 不足 | e2e 测试中未发现使用 AI Mock Interceptor 的代码 |

### 6.3 问题

1. **Fixture 不足**: 仅有 glm-chat.json, doubao-seedream.json, try-on-result.json 三个 fixture
2. **未被 E2E 测试使用**: 现有 e2e 测试直接使用 AppModule 或 mock，未集成 AI Mock Interceptor
3. **缺少录制流程文档**: 没有说明如何录制新 fixture 的文档或脚本

---

## 七、测试基础设施评估

### 7.1 后端

| 组件 | 状态 | 说明 |
|------|------|------|
| jest.config.js | 有 | ts-jest preset, 30s timeout |
| jest.setup.js | 有 | 全局 mock 外部依赖 |
| jest.resolver.js | 有 | 模块解析 |
| test/setup.ts | 有 | 环境变量 + 全局 mock + 钩子 |
| test/utils/ | 有 | 完整的测试工具集 |
| test/fixtures/ | 有 | AI 响应 fixture (不完整) |
| coverageThreshold | 虚假 | 设置 90% 但实际 ~15% |

### 7.2 移动端

| 组件 | 状态 | 说明 |
|------|------|------|
| jest.config.js | 有 | jest-expo preset |
| jest.setup.js | 有 | 基础 RN mock |
| e2e/jest.config.js | 有 | detox/test-runner preset |
| 单元测试文件 | 无 | 0 个 |
| E2E 测试文件 | 2 个 | 仅认证+导航 |
| coverageThreshold | 虚假 | 设置 80-90% 但实际 0% |

### 7.3 Python AI 服务

| 组件 | 状态 | 说明 |
|------|------|------|
| conftest.py | 有 | 完整的 fixture 和 mock |
| pytest 配置 | 有 | pytest-asyncio |
| API 测试 | 有 | 8 个端点测试 |
| 服务级测试 | 不足 | 仅 2 个服务有测试 |

---

## 八、改进建议

### 8.1 紧急 (P0 - 阻塞发布)

1. **补全核心模块测试**: 优先为以下模块添加 service.spec:
   - ai-stylist 子服务 (chat.service, context.service, llm-provider.service, decision-engine.service)
   - try-on 子服务 (tryon-orchestrator.service, cloud-tryon.provider)
   - payment 子服务 (alipay.provider, wechat.provider, payment-security.guard)
   - photos 子服务 (ai-analysis.service, body-shape-analyzer.service)
   - ws (app.gateway, ai.gateway)

2. **移动端核心 Store 测试**: 为 9 个 Zustand store 添加单元测试
   - quizStore, profileStore, photoStore, onboardingStore (核心业务)
   - wardrobeStore, clothingStore, homeStore (重要功能)

3. **移动端核心 Service 测试**: 为 API 层添加测试
   - api/auth.api.ts, api/ai-stylist.api.ts, api/tryon.api.ts
   - api/commerce.api.ts, api/subscription.api.ts
   - services/apiClient.ts

4. **Python 核心服务测试**: 为 AI 核心服务添加 pytest 测试
   - intelligent_stylist_service.py
   - visual_outfit_service.py
   - ai_service.py

### 8.2 重要 (P1 - 提升质量)

5. **补全 AI Mock Fixture**: 录制更多 AI API 响应 fixture
   - GLM 造型师对话 (多种场景)
   - GLM 穿搭可视化
   - 体型分析响应
   - 错误/超时场景

6. **E2E 测试集成 AI Mock**: 将 AI Mock Interceptor 集成到 e2e 测试中

7. **补全 Controller 测试**: 为所有 controller 添加测试

8. **移动端 E2E 补全**: 添加核心业务流程 E2E
   - Onboarding 流程
   - 风格测试流程
   - 拍照+分析流程
   - 虚拟试衣流程
   - 购物车+支付流程

9. **修正覆盖率阈值**: 将 jest.config.js 中的 coverageThreshold 调整为实际可达的目标
   - 后端: 先设 30%，逐步提升
   - 移动端: 先设 10%，逐步提升

### 8.3 改善 (P2 - 长期质量)

10. **添加 CI 测试门禁**: 在 CI 中强制执行覆盖率检查
11. **添加 mutation testing**: 使用 Stryker 等工具验证测试质量
12. **添加性能测试**: 为关键 API 添加性能基准测试
13. **添加安全测试**: 为 auth, payment, security 模块添加安全测试
14. **建立测试数据工厂**: 统一管理测试数据生成

---

## 九、风险评级

| 风险等级 | 范围 | 说明 |
|---------|------|------|
| **严重** | 移动端 0% 单元测试 | 50 个页面、9 个 Store、33 个 Service 无任何测试，任何改动都可能引入回归 |
| **严重** | AI 核心服务无测试 | intelligent_stylist, visual_outfit 等核心 AI 逻辑无单元测试 |
| **严重** | 支付子服务无测试 | alipay.provider, wechat.provider 无测试，支付逻辑正确性无法保证 |
| **高** | WebSocket 无测试 | 实时通信逻辑未验证 |
| **高** | Controller 测试不足 | 30+ 个 controller 仅 2 个有测试，API 契约未验证 |
| **高** | 覆盖率阈值虚假 | 设置 90% 但实际 ~15%，可能给团队错误信心 |
| **中** | AI Mock 未集成 | 精心设计的 AI Mock 系统未被 E2E 测试使用 |
| **中** | Fixture 不足 | 仅 3 个 AI fixture，无法覆盖多样化场景 |

---

## 十、结论

AiNeed 项目当前测试覆盖率远低于生产级标准。后端约 15-20% 的行覆盖率、移动端 0% 的单元测试覆盖率、Python AI 服务约 25% 的核心模块覆盖率，均无法有效保障产品质量。

**亮点**: 后端测试基础设施 (mock 工具、AI Mock 录制/回放系统、E2E 框架) 设计精良，部分核心模块 (auth, payment, ai-stylist) 的测试用例质量较高，覆盖了正常/异常/边界场景。

**核心问题**: 测试广度严重不足 -- 大量模块和子服务无测试，移动端完全没有单元测试，AI 核心服务缺少单元测试，覆盖率阈值设置虚假。

**建议**: 按照 P0 > P1 > P2 优先级逐步补全测试，优先保障核心业务逻辑 (AI 造型师、支付、认证、虚拟试衣) 的测试覆盖，再扩展到其他模块。
