# AiNeed 代码冲突审计报告

> 审计时间: 2026-04-13
> 审计范围: C:\AiNeed 全代码库
> 审计类型: 代码冲突检测（5 类）

---

## 一、重复 import/export 冲突

### CONFLICT-001: ProfileController 与 PosterController 共享同一 Controller 路由前缀

- **冲突类型**: 重复 Controller 路由注册
- **涉及文件**:
  - `apps/backend/src/modules/profile/profile.controller.ts` - `@Controller("profile")`
  - `apps/backend/src/modules/profile/poster.controller.ts` - `@Controller("profile")`
- **具体描述**: 两个 Controller 类都注册了 `@Controller("profile")` 路由前缀。ProfileController 处理 `GET/PUT /profile`、`GET /profile/body-analysis` 等端点；PosterController 处理 `POST /profile/poster` 和 `GET /profile/poster/:id`。虽然 NestJS 允许同一模块内多个 Controller 共享路由前缀，但 PosterController 的 `@ApiTags("profile")` 与 ProfileController 完全相同，导致 Swagger 文档中两个 Controller 的端点混在一起，难以区分。
- **严重程度**: MEDIUM

### CONFLICT-002: PhotosController 与 PhotoQualityController 共享同一 Controller 路由前缀

- **冲突类型**: 重复 Controller 路由注册
- **涉及文件**:
  - `apps/backend/src/modules/photos/photos.controller.ts` - `@Controller("photos")`
  - `apps/backend/src/modules/photos/photo-quality.controller.ts` - `@Controller("photos")`
- **具体描述**: 两个 Controller 类都注册了 `@Controller("photos")` 路由前缀，且都使用 `@ApiTags("photos")`。PhotosController 处理照片上传/列表/详情/删除等端点；PhotoQualityController 处理 `POST /photos/quality-check` 和 `POST /photos/enhance`。两个 Controller 共享同一路由前缀和 Swagger Tag，Swagger 文档中端点混在一起。
- **严重程度**: MEDIUM

### CONFLICT-003: auth.dto.ts 中 UpdateProfileDto 与 profile.dto.ts 中 UpdateProfileDto 名称冲突

- **冲突类型**: DTO 类名重复导出
- **涉及文件**:
  - `apps/backend/src/modules/auth/dto/auth.dto.ts` - 导出 `UpdateProfileDto`（含 nickname, gender, birthDate）
  - `apps/backend/src/modules/profile/dto/profile.dto.ts` - 导出 `UpdateProfileDto`（含 nickname, avatar, gender, birthDate, height, weight, bodyType, skinTone 等）
- **具体描述**: 两个不同模块各自定义了同名 `UpdateProfileDto`，字段内容不同。auth 模块的版本仅包含基本注册信息字段（3 个），profile 模块的版本包含完整形象档案字段（16 个）。虽然它们在不同模块中不会直接冲突，但 ProfileController 中通过别名导入 `UpdateProfileDto as ServiceUpdateProfileDto` 和 `UpdateProfileDto as UserUpdateProfileDto` 来区分，说明开发者已意识到命名冲突问题。这种重复定义增加了维护成本和混淆风险。
- **严重程度**: MEDIUM

### CONFLICT-004: ProfileController 中 UpdateProfileDto 的双重导入别名

- **冲突类型**: 同一文件内重复导入不同来源的同名类
- **涉及文件**:
  - `apps/backend/src/modules/profile/profile.controller.ts`
- **具体描述**: 文件第 13-14 行：
  ```typescript
  import { ProfileService, UpdateProfileDto as ServiceUpdateProfileDto } from "./profile.service";
  import { UserProfileService, UpdateProfileDto as UserUpdateProfileDto } from "./services/user-profile.service";
  ```
  同时还从 dto 目录导入了第三个 `UpdateProfileDto`（第 16-24 行）。三个不同来源的 `UpdateProfileDto` 通过别名区分，说明存在严重的命名冲突。实际使用中 `updateProfile` 方法使用 `ServiceUpdateProfileDto`，`updatePreferences` 方法使用 `UserUpdateProfileDto`，而 dto 目录的 `UpdateProfileDto` 未被直接使用。
- **严重程度**: HIGH

---

## 二、packages/shared 类型 vs Prisma Schema 一致性

### CONFLICT-005: shared/enums.ts 中 ColorSeasonType 与 Prisma ColorSeason 命名不一致

- **冲突类型**: 类型命名不一致
- **涉及文件**:
  - `packages/shared/src/types/enums.ts` - `ColorSeasonType`
  - `apps/backend/prisma/schema.prisma` - `ColorSeason`（enum）
- **具体描述**: Prisma schema 中枚举名为 `ColorSeason`，而 shared types 中命名为 `ColorSeasonType`。虽然 shared 包中加 `Type` 后缀是 TypeScript 类型别名（type alias）的惯例，但这导致前端使用 `ColorSeasonType` 而后端使用 `ColorSeason`，两端的命名不统一，增加沟通成本。
- **严重程度**: LOW

### CONFLICT-006: shared/user.ts 中 UserProfile 缺少 Prisma UserProfile 的 skippedOnboardingSteps 字段

- **冲突类型**: 共享类型缺少 Schema 字段
- **涉及文件**:
  - `packages/shared/src/types/user.ts` - `UserProfile` interface
  - `apps/backend/prisma/schema.prisma` - `UserProfile` model
- **具体描述**: Prisma schema 中 `UserProfile` 模型包含 `skippedOnboardingSteps String[] @default([])` 字段，但 shared types 中的 `UserProfile` interface 没有此字段。前端无法感知用户跳过了哪些 onboarding 步骤。
- **严重程度**: MEDIUM

### CONFLICT-007: shared/profile.ts 中 StyleProfile.confidence 类型为 number，Prisma 中为 Int

- **冲突类型**: 类型精度差异
- **涉及文件**:
  - `packages/shared/src/types/profile.ts` - `StyleProfile.confidence: number`
  - `apps/backend/prisma/schema.prisma` - `StyleProfile.confidence Int @default(70)`
- **具体描述**: TypeScript 中 `number` 类型可以表示浮点数，但 Prisma schema 中 `confidence` 是 `Int` 类型（0-100 的整数）。shared 类型定义不够精确，可能导致前端误传浮点数值。
- **严重程度**: LOW

### CONFLICT-008: shared/profile.ts 中 ColorSeason 接口与 Prisma ColorSeason enum 语义不同

- **冲突类型**: 同名类型语义冲突
- **涉及文件**:
  - `packages/shared/src/types/profile.ts` - `ColorSeason` interface（含 type, label, description, bestColors 等字段）
  - `apps/backend/prisma/schema.prisma` - `ColorSeason` enum（spring/summer/autumn/winter）
- **具体描述**: shared types 中的 `ColorSeason` 是一个包含详细色彩分析数据的 interface，而 Prisma 中的 `ColorSeason` 是一个简单枚举。两者名称完全相同但语义完全不同，前端开发者可能混淆使用。
- **严重程度**: HIGH

### CONFLICT-009: shared/enums.ts 中 AgeRange 与 Prisma schema 无对应

- **冲突类型**: 共享类型在 Schema 中无对应
- **涉及文件**:
  - `packages/shared/src/types/enums.ts` - `AgeRange` type
  - `apps/backend/prisma/schema.prisma` - 无 `AgeRange` enum
- **具体描述**: shared types 中定义了 `AgeRange = 'under_18' | '18_24' | '25_34' | '35_44' | '45_54' | '55_plus'`，但 Prisma schema 中没有对应的 enum。而 onboarding.dto.ts 中使用了不同的 AgeRange 值 `'18-24' | '25-34' | '35-44' | '45-54' | '55+'`（用短横线分隔而非下划线）。三处定义不一致。
- **严重程度**: MEDIUM

### CONFLICT-010: shared/enums.ts 中 PostStatus 与 Prisma CommunityPost 状态字段不一致

- **冲突类型**: 共享类型与 Schema 状态枚举不匹配
- **涉及文件**:
  - `packages/shared/src/types/enums.ts` - `PostStatus = 'active' | 'hidden' | 'deleted'`
  - `apps/backend/prisma/schema.prisma` - `CommunityPost` 使用 `isDeleted Boolean` + `isFeatured Boolean`，无 PostStatus enum
- **具体描述**: shared types 定义了 `PostStatus` 枚举（active/hidden/deleted），但 Prisma schema 中 CommunityPost 模型没有使用此枚举，而是使用 `isDeleted` 布尔字段和 `isFeatured` 布尔字段来表示状态。前端使用 PostStatus 枚举与后端实际数据模型不匹配。
- **严重程度**: MEDIUM

---

## 三、模块注册遗漏/重复

### CONFLICT-011: SecurityModule 和 EmailModule 有模块文件但未在 app.module.ts 中注册

- **冲突类型**: 模块注册遗漏
- **涉及文件**:
  - `apps/backend/src/modules/security/security.module.ts` - 存在但未注册
  - `apps/backend/src/common/email/email.module.ts` - 存在但未注册
  - `apps/backend/src/app.module.ts` - 未包含上述模块
- **具体描述**: `security.module.ts` 和 `email.module.ts` 文件存在于代码库中，但未在 `app.module.ts` 的 `imports` 数组中注册。如果这些模块包含需要全局生效的 providers 或 guards，它们将不会被执行。SecurityModule 可能包含安全相关的全局守卫，EmailModule 可能包含邮件发送服务，遗漏注册可能导致功能缺失。
- **严重程度**: HIGH

### CONFLICT-012: LoggingModule 在 app.module.ts 中注册但文件位于 common/logger/ 而非 common/logging/

- **冲突类型**: 模块路径不一致
- **涉及文件**:
  - `apps/backend/src/app.module.ts` - `import { LoggingModule } from "./common/logging";`
  - `apps/backend/src/common/logger/logger.module.ts` - 实际模块文件位置
  - `apps/backend/src/common/logging/logging.module.ts` - 可能存在另一个
- **具体描述**: app.module.ts 从 `./common/logging` 导入 LoggingModule，但代码库中同时存在 `common/logger/` 和 `common/logging/` 两个目录。可能存在两个 LoggingModule 实现，需要确认导入的是正确的版本。
- **严重程度**: MEDIUM

### CONFLICT-013: app.module.ts 中未注册 EncryptionModule 的实际使用确认

- **冲突类型**: 潜在模块注册遗漏
- **涉及文件**:
  - `apps/backend/src/common/encryption/encryption.module.ts`
  - `apps/backend/src/app.module.ts` - 已注册 EncryptionModule
- **具体描述**: 经核实，EncryptionModule 已在 app.module.ts 第 11 行注册。此项为误报，标记为已确认无冲突。
- **严重程度**: LOW（已确认无冲突）

---

## 四、Controller 端点 URL 冲突

### CONFLICT-014: GET /api/v1/auth/me 与 GET /api/v1/users/me 端点功能重叠

- **冲突类型**: 端点功能重叠
- **涉及文件**:
  - `apps/backend/src/modules/auth/auth.controller.ts` - `@Get("me")` under `@Controller("auth")` -> `GET /auth/me`
  - `apps/backend/src/modules/users/users.controller.ts` - `@Get("me")` under `@Controller("users")` -> `GET /users/me`
- **具体描述**: 两个端点都返回当前登录用户的信息。`GET /auth/me` 返回 `{ id, email, nickname, avatar }`（来自 JWT payload），`GET /users/me` 返回完整用户信息（通过数据库查询）。两个端点功能高度重叠，但返回数据详细程度不同，可能导致前端开发者混淆应该调用哪个。
- **严重程度**: MEDIUM

### CONFLICT-015: DemoController 使用硬编码的完整路由前缀 /api/v1/demo

- **冲突类型**: 路由前缀风格不一致
- **涉及文件**:
  - `apps/backend/src/modules/demo/demo.controller.ts` - `@Controller('api/v1/demo')`
- **具体描述**: 所有其他 Controller 都使用简短路由前缀（如 `@Controller("auth")`、`@Controller("clothing")`），由全局前缀 `/api/v1` 统一添加。但 DemoController 硬编码了 `@Controller('api/v1/demo')`，如果 main.ts 中设置了全局前缀 `api/v1`，则实际路由会变成 `/api/v1/api/v1/demo`，导致路由重复。
- **严重程度**: CRITICAL

### CONFLICT-016: GET /api/v1/search/similar/:id 与 GET /api/v1/ai/similar/:itemId 端点功能重叠

- **冲突类型**: 端点功能重叠
- **涉及文件**:
  - `apps/backend/src/modules/search/search.controller.ts` - `@Get("similar/:id")` -> `GET /search/similar/:id`
  - `apps/backend/src/modules/ai/ai.controller.ts` - `@Get("similar/:itemId")` -> `GET /ai/similar/:itemId`
- **具体描述**: 两个端点都提供"根据商品 ID 查找相似商品"的功能。search 模块调用 `visualSearchService.findSimilarItems`，ai 模块调用 `aiService.findSimilarItemsForItem`。两个不同的服务实现同一功能，可能导致结果不一致。
- **严重程度**: MEDIUM

### CONFLICT-017: POST /api/v1/search/image 与 POST /api/v1/ai/similar 端点功能重叠

- **冲突类型**: 端点功能重叠
- **涉及文件**:
  - `apps/backend/src/modules/search/search.controller.ts` - `@Post("image")` -> `POST /search/image`
  - `apps/backend/src/modules/ai/ai.controller.ts` - `@Post("similar")` -> `POST /ai/similar`
- **具体描述**: 两个端点都提供"上传图片搜索相似商品"的功能。search 模块使用 `visualSearchService.searchByImage`，ai 模块使用 `aiService.findSimilarItemsBuffer`。功能重叠且实现不同。
- **严重程度**: MEDIUM

### CONFLICT-018: GET /api/v1/recommendations/trending 与 GET /api/v1/search/trending 端点功能重叠

- **冲突类型**: 端点功能重叠
- **涉及文件**:
  - `apps/backend/src/modules/recommendations/recommendations.controller.ts` - `@Get("trending")` -> `GET /recommendations/trending`
  - `apps/backend/src/modules/search/search.controller.ts` - `@Get("trending")` -> `GET /search/trending`
- **具体描述**: recommendations 模块的 trending 端点返回热门服装趋势推荐（基于全平台用户行为统计），search 模块的 trending 端点返回热门搜索关键词。虽然返回数据类型不同，但端点名称相同，容易混淆。
- **严重程度**: LOW

---

## 五、DTO vs Schema 字段名/类型一致性

### CONFLICT-019: auth.dto.ts 中 UpdateProfileDto.gender 使用局部 Gender 类型，与 Prisma Gender enum 不一致

- **冲突类型**: DTO 枚举定义与 Prisma enum 不一致
- **涉及文件**:
  - `apps/backend/src/modules/auth/dto/auth.dto.ts` - 自定义 `Gender = "male" | "female" | "other"` (type alias)
  - `apps/backend/prisma/schema.prisma` - `enum Gender { male, female, other }`
- **具体描述**: auth.dto.ts 在文件内重新定义了 `Gender` 类型（第 17-18 行），而非从 `@prisma/client` 导入。虽然值相同，但维护两处定义增加了不一致风险。相比之下，profile.dto.ts 正确地从 `@prisma/client` 导入了 `Gender`。
- **严重程度**: LOW

### CONFLICT-020: onboarding.dto.ts 中 AgeRange 值与 shared/enums.ts 中 AgeRange 值不一致

- **冲突类型**: DTO 枚举值与共享类型不一致
- **涉及文件**:
  - `apps/backend/src/modules/onboarding/dto/onboarding.dto.ts` - `AgeRangeValues = ["18-24", "25-34", "35-44", "45-54", "55+"]`
  - `packages/shared/src/types/enums.ts` - `AgeRange = 'under_18' | '18_24' | '25_34' | '35_44' | '45_54' | '55_plus'`
- **具体描述**: 两处定义的年龄段值完全不同：
  - onboarding DTO 使用短横线分隔：`"18-24"`, `"25-34"`, `"35-44"`, `"45-54"`, `"55+"`
  - shared types 使用下划线分隔：`'18_24'`, `'25_34'`, `'35_44'`, `'45_54'`, `'55_plus'`
  - shared types 多了 `'under_18'` 选项
  - onboarding DTO 没有 `'under_18'` 选项

  此外，Prisma schema 中没有 AgeRange enum，User 模型中也没有 ageRange 字段，说明这个概念在数据库层完全没有持久化。
- **严重程度**: HIGH

### CONFLICT-021: customization.controller.ts 中 CustomizationType 枚举值与 Prisma 不一致

- **冲突类型**: DTO 枚举值与 Prisma enum 不一致
- **涉及文件**:
  - `apps/backend/src/modules/customization/customization.controller.ts` - API 文档中写 `["ALTERATION", "CUSTOM_MADE", "BESPOKE"]`
  - `apps/backend/prisma/schema.prisma` - `enum CustomizationType { tailored, bespoke, alteration, design }`
- **具体描述**: Controller 的 Swagger 文档中列出的定制类型为 `ALTERATION`, `CUSTOM_MADE`, `BESPOKE`（大写、英文风格），但 Prisma schema 中的枚举值为 `tailored`, `bespoke`, `alteration`, `design`（小写、不同名称）。具体差异：
  - Controller 有 `CUSTOM_MADE`，Prisma 没有
  - Prisma 有 `design`，Controller 没有
  - Controller 使用大写，Prisma 使用小写

  实际代码中 `createRequest` 方法的参数类型声明为 `CustomizationType`（从 `@prisma/client` 导入），所以运行时会使用 Prisma 的值，但 Swagger 文档展示的值是错误的。
- **严重程度**: HIGH

### CONFLICT-022: customization.controller.ts 中 CustomizationStatus 枚举值与 Prisma 不一致

- **冲突类型**: DTO 枚举值与 Prisma enum 不一致
- **涉及文件**:
  - `apps/backend/src/modules/customization/customization.controller.ts` - API 文档中写 `["DRAFT", "SUBMITTED", "QUOTED", "IN_PRODUCTION", "COMPLETED", "CANCELLED"]`
  - `apps/backend/prisma/schema.prisma` - `enum CustomizationStatus { draft, submitted, quoting, confirmed, in_progress, completed, cancelled }`
- **具体描述**: Controller 的 Swagger 文档中列出的状态值与 Prisma schema 完全不同：
  - Controller: `QUOTED` -> Prisma: `quoting`（大小写+名称不同）
  - Controller: `IN_PRODUCTION` -> Prisma: `in_progress`（完全不同的名称）
  - Controller 缺少 `confirmed` 状态
  - Controller 使用全大写，Prisma 使用小写

  与 CONFLICT-021 相同，实际代码使用 Prisma 枚举值，但 Swagger 文档展示错误。
- **严重程度**: HIGH

### CONFLICT-023: profile.dto.ts 中 UpdateProfileDto 包含 User 模型字段和 UserProfile 模型字段的混合

- **冲突类型**: DTO 字段来源混淆
- **涉及文件**:
  - `apps/backend/src/modules/profile/dto/profile.dto.ts` - `UpdateProfileDto`
  - `apps/backend/prisma/schema.prisma` - `User` model + `UserProfile` model
- **具体描述**: `UpdateProfileDto` 同时包含来自 `User` 模型的字段（nickname, avatar, gender, birthDate）和来自 `UserProfile` 模型的字段（height, weight, shoulder, bust, waist, hip, inseam, bodyType, skinTone, faceShape, colorSeason, stylePreferences, colorPreferences）。虽然这种混合 DTO 在业务上合理（一次请求更新用户基本信息和形象档案），但与 Prisma 的两个独立模型不对应，Service 层需要手动拆分字段分别更新，增加了出错风险。
- **严重程度**: LOW

### CONFLICT-024: queue.controller.ts 中 DTO 类定义在 Controller 文件内而非独立 DTO 文件

- **冲突类型**: 代码组织不规范
- **涉及文件**:
  - `apps/backend/src/modules/queue/queue.controller.ts` - 内联定义了 `UserProfileDto`, `CreateStyleAnalysisDto`, `CreateVirtualTryOnDto`, `CreateWardrobeMatchDto`, `CreateRecommendationDto`
  - `apps/backend/src/modules/queue/dto/queue.dto.ts` - 存在但未被使用
- **具体描述**: queue.controller.ts 在文件内直接定义了 5 个 DTO 类（第 31-108 行），而 `dto/queue.dto.ts` 文件存在但内容可能不同。Controller 内的 DTO 使用了 `@IsString()` 验证 bodyType/skinTone/colorSeason，但这些值在 Prisma 中是 enum 类型，DTO 应使用 `@IsEnum()` 验证。此外，`CreateVirtualTryOnDto` 与 try-on 模块的 `CreateTryOnDto` 功能重叠。
- **严重程度**: MEDIUM

---

## 冲突统计

| 严重程度 | 数量 | 冲突编号 |
|---------|------|---------|
| CRITICAL | 1 | CONFLICT-015 |
| HIGH | 5 | CONFLICT-004, CONFLICT-008, CONFLICT-011, CONFLICT-020, CONFLICT-021, CONFLICT-022 |
| MEDIUM | 11 | CONFLICT-001, CONFLICT-002, CONFLICT-003, CONFLICT-006, CONFLICT-010, CONFLICT-012, CONFLICT-014, CONFLICT-016, CONFLICT-017, CONFLICT-024 |
| LOW | 6 | CONFLICT-005, CONFLICT-007, CONFLICT-009, CONFLICT-013, CONFLICT-018, CONFLICT-019, CONFLICT-023 |

**总计: 24 个冲突**

---

## 优先修复建议

### P0 - 立即修复 (CRITICAL)
1. **CONFLICT-015**: DemoController 路由前缀 `api/v1/demo` 应改为 `demo`，避免与全局前缀重复

### P1 - 尽快修复 (HIGH)
2. **CONFLICT-021/022**: customization.controller.ts 的 Swagger 文档枚举值必须与 Prisma schema 对齐
3. **CONFLICT-020**: 统一 AgeRange 的值定义，建议以 Prisma schema 为准（但目前 Prisma 中无此 enum，需先补充）
4. **CONFLICT-008**: 重命名 shared/profile.ts 中的 `ColorSeason` interface 为 `ColorSeasonDetail` 或 `ColorSeasonProfile`，避免与 Prisma enum 混淆
5. **CONFLICT-004**: 重命名 auth.dto.ts 中的 `UpdateProfileDto` 为 `UpdateAuthProfileDto`，消除 ProfileController 中的三重别名导入
6. **CONFLICT-011**: 确认 SecurityModule 和 EmailModule 是否需要注册到 app.module.ts

### P2 - 计划修复 (MEDIUM)
7. **CONFLICT-001/002**: 为 PosterController 和 PhotoQualityController 分配独立的路由前缀或 Swagger Tag
8. **CONFLICT-003**: 统一 auth 和 profile 模块中的 UpdateProfileDto 命名
9. **CONFLICT-006**: 在 shared/user.ts 的 UserProfile 中补充 skippedOnboardingSteps 字段
10. **CONFLICT-014/016/017**: 整理重叠端点，明确各模块职责边界
11. **CONFLICT-024**: 将 queue.controller.ts 内联 DTO 移至 dto 文件并使用 Prisma enum 验证
