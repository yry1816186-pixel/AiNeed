# Research: Phase 08 — 类型系统统一

**Created:** 2026-04-17
**Status:** Complete

## 1. 现状概览

### 1.1 三套类型系统

| 包 | 位置 | 行数 | 实际被引用 |
|---|---|---|---|
| `@xuno/types` | `packages/types/src/index.ts` | 899 | mobile `types/index.ts` + `shared/types/index.ts` |
| `@xuno/shared` | `packages/shared/src/` | ~300 | **从未被引用** |
| mobile 本地 | `apps/mobile/src/types/` | ~600 | 移动端全部代码 |

**关键发现**：后端虽然在 `package.json` 声明了两个共享包依赖，但代码中**从未实际 import**。

### 1.2 第四个重复源

`apps/mobile/src/shared/types/` 是 `apps/mobile/src/types/` 的子集副本（仅 api/events/components/animations），内容完全一致。

## 2. 六大冲突详析

### 冲突 1: Gender — enum vs type alias vs 内联字面量

| 位置 | 定义 | 值 |
|---|---|---|
| `@xuno/types` L56 | `enum Gender` | Male='male', Female='female', Other='other' |
| `@xuno/shared` enums.ts:1 | `type Gender` | 'male' \| 'female' \| 'other' |
| mobile user.ts:7 | 内联字面量 | "male" \| "female" \| "other" |

**影响**：同名标识符不能同时导入，mobile 不得不使用 `SharedGender` 别名。

### 冲突 2: User — 字段集分裂

| 字段 | `@xuno/types` User | mobile User |
|---|---|---|
| gender | `Gender?` (enum) | `"male" \| "female" \| "other"?` (内联) |
| birthDate | `Date?` | `string?` |
| subscriptionTier | **不存在** | `"basic" \| "premium" \| "vip"?` |
| onboardingCompleted | **不存在** | `boolean?` |
| height/weight/bodyType/skinTone/colorSeason | **不存在** | 全部存在 |
| preferences | **不存在** | `UserPreferences?` |
| createdAt/updatedAt | `Date` | `string` |

**本质**：`@xuno/types` 的 User 是极简认证模型，mobile 的是聚合模型。

### 冲突 3: ClothingItem — 商品目录 vs 衣柜单品

| 字段 | `@xuno/types` | mobile |
|---|---|---|
| 语义 | **商品目录项** | **衣柜单品** |
| brandId/brand | `brandId?: string`, `brand?: Brand` | `brand?: string` (品牌名) |
| sizes | `string[]` | 不存在 |
| price/currency | `number` + `string` | `number?` |
| images | `string[]` | 不存在 |
| imageUri/thumbnailUri | 不存在 | `string` + `string?` |
| style/seasons/occasions | 在 `attributes` 中 | 顶层字段 |
| wearCount/lastWorn/isFavorite | 不存在 | 存在 |
| purchaseDate/notes | 不存在 | 存在 |

**字段重叠 < 30%**。mobile 的 `index.ts` 将共享版本重命名为 `SharedClothingItem`。

**ClothingCategory 也冲突**：
- `@xuno/types`: 8 值 (含 `footwear`)
- `@xuno/shared`: 8 值 (含 `footwear`)
- mobile: 12 值 (用 `shoes` 替代 `footwear`，增加 `formal/underwear/sleepwear/other`)

### 冲突 4: ApiResponse/PaginatedResponse

**ApiResponse**：
- `@xuno/types`: 有 `meta?: {page?, limit?, total?}`，无 `message`
- `@xuno/shared`: 有 `meta?: {page?, limit?, total?, totalPages?}`，无 `message`
- mobile: 有 `message?: string`，无 `meta`

**PaginatedResponse**：
- `@xuno/types`: 有 `pageSize` + `limit` (deprecated)
- `@xuno/shared`: 只有 `limit`
- mobile: 有 `pageSize` + `limit`

### 冲突 5: BodyAnalysis

| 位置 | 类型名 | 特有字段 |
|---|---|---|
| `@xuno/shared` profile.ts | `BodyTypeAnalysis` | shoulderWidth, bustWaistRatio, waistHipRatio, rawResult, analyzedAt |
| mobile user.ts | `BodyAnalysis` | recommendations: {suitable, avoid, tips} |

名称不同、功能侧重不同，但核心字段 (bodyType, skinTone, colorSeason, confidence) 重叠。

### 冲突 6: CustomizationType/CustomizationStatus

| 类型 | `@xuno/types` | `@xuno/shared` | mobile |
|---|---|---|---|
| CustomizationType | enum (4值) | type (4值) | type (5值,多'pod') |
| CustomizationStatus | enum (8值,有Shipped) | type (7值,无shipped) | type (8值,有shipped) |

## 3. enum vs type alias 系统性分歧

`@xuno/types` 全部使用 `enum`（运行时对象，tree-shaking 不友好），`@xuno/shared` 全部使用 `type` alias（纯类型层，零运行时开销）。

同名 enum 和 type alias 不能同时导入，这是 mobile `SharedXxx` 别名 workaround 的根本原因。

## 4. 日期类型不一致

| 位置 | 日期字段 |
|---|---|
| `@xuno/types` | `Date` |
| `@xuno/shared` | `string` |
| mobile | `string` |

API 返回 JSON 是 ISO 字符串，`@xuno/types` 的 `Date` 需要手动转换。

## 5. @xuno/shared 内容审计

| 模块 | 内容 | 与 @xuno/types 重叠 | 独有价值 |
|---|---|---|---|
| enums.ts | 30+ type alias | 全部重叠（同名不同形式） | 多 15 个 type（OnboardingStep, AgeRange 等） |
| user.ts | UserProfile, BasicInfoPayload, Onboarding* | UserProfile 重叠 | OnboardingState/Progress 独有 |
| auth.ts | LoginPayload, RegisterPayload, AuthResponse | 无 | 独有 |
| profile.ts | BodyTypeAnalysis, ColorSeasonProfile, StyleProfile | BodyTypeAnalysis 重叠 | ColorSeasonProfile/ColorPalette/StyleProfile 独有 |
| quiz.ts | QuizQuestion, QuizAnswer, QuizResult | 无 | 独有 |
| photo.ts | PhotoQualityReport, UserPhoto | UserPhoto 重叠 | PhotoQualityReport 独有 |
| api.ts | ApiResponse, PaginatedResponse, JsonApiResponse | 重叠 | JsonApiResponse/CursorPagination 独有 |
| notification.ts | Notification, NotificationSettings | 无 | 独有 |
| validation.ts | 正则验证函数 | 无 | **独有且有价值** |

## 6. 决策矩阵

| 决策点 | 选项 | 推荐 | 理由 |
|---|---|---|---|
| enum vs type alias | A: 全部 enum / B: 全部 type alias / C: 混合 | **B: type alias** | 零运行时开销，tree-shaking 友好，与 API 契约一致 |
| 日期类型 | A: Date / B: string / C: 泛型参数 | **B: string** | API 返回 ISO string，无需转换 |
| @xuno/shared 处置 | A: 保留独立 / B: 合并到 @xuno/types / C: 删除 | **B: 合并有价值的独有类型，删除重复** | shared 从未被引用，重叠严重 |
| ClothingItem | A: 统一为一个 / B: 拆分 CatalogItem + WardrobeItem | **B: 拆分** | 语义完全不同，字段重叠<30% |
| User 类型 | A: 扩展共享 User / B: mobile 用 UserProfile | **A: 共享 User 扩展字段 + mobile extends** | subscriptionTier/onboardingCompleted 应进入共享类型 |
