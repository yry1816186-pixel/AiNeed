# Validation: Phase 08 — 类型系统统一

**Created:** 2026-04-17
**Phase Status:** Planning Complete

## UAT Criteria

### UAT-01: @xuno/types 是唯一共享类型包
- [ ] `packages/shared/` 目录已删除
- [ ] `grep -r "@xuno/shared" apps/ packages/ --include="*.ts" --include="*.tsx"` 返回 0
- [ ] `apps/backend/package.json` 无 `@xuno/shared` 依赖
- [ ] `apps/mobile/package.json` 无 `@xuno/shared` 依赖

### UAT-02: 无 enum 定义
- [ ] `grep -r "^export enum " packages/types/src/ --include="*.ts"` 返回 0
- [ ] 所有枚举已替换为 type alias
- [ ] 无 `Gender.Female` 等枚举成员访问语法

### UAT-03: 日期字段统一为 string
- [ ] `grep -r ": Date" packages/types/src/ --include="*.ts"` 返回 0
- [ ] 所有 `createdAt`, `updatedAt`, `birthDate`, `analyzedAt` 等字段类型为 `string`

### UAT-04: User 类型完整
- [ ] `User` 接口包含 `subscriptionTier`, `onboardingCompleted`, `height`, `weight`, `bodyType`, `skinTone`, `colorSeason`, `preferences` 字段
- [ ] `UserPreferences` 接口定义在 @xuno/types
- [ ] mobile `user.ts` 中无本地 `User` 接口定义

### UAT-05: ClothingItem 拆分完成
- [ ] `CatalogItem` 接口定义在 `packages/types/src/clothing.ts`
- [ ] `WardrobeItem` 接口定义在 `packages/types/src/wardrobe.ts`
- [ ] `ClothingCategory` 统一为 12 值（含 shoes, formal, underwear, sleepwear, other）
- [ ] mobile `clothing.ts` 中无本地 `ClothingItem` 接口定义

### UAT-06: ApiResponse/PaginatedResponse 统一
- [ ] `ApiResponse` 同时有 `message?: string` 和 `meta?: PaginationMeta`
- [ ] `PaginatedResponse` 有 `pageSize` + `limit` + `totalPages`
- [ ] mobile `api.ts` 中 `ApiResponse`, `PaginatedResponse` 从 @xuno/types 导入

### UAT-07: BodyAnalysis 统一
- [ ] `BodyAnalysis` 定义在 `packages/types/src/profile.ts`
- [ ] 包含 ML 字段（shoulderWidth, bustWaistRatio, waistHipRatio）
- [ ] 包含推荐字段（recommendations）
- [ ] 全部 camelCase，无 snake_case

### UAT-08: CustomizationType/Status 统一
- [ ] `CustomizationType` 包含 `'pod'`
- [ ] `CustomizationStatus` 包含 `'shipped'`
- [ ] `CustomizationRequest` 包含 designId, templateId, previewImageUrl, trackingNumber, carrier

### UAT-09: 无 SharedXxx 别名
- [ ] `grep -r "SharedGender\|SharedBodyType\|SharedSkinTone\|SharedClothingItem\|SharedClothingCategory" apps/mobile/src/ --include="*.ts"` 返回 0

### UAT-10: 无重复类型目录
- [ ] `test -d apps/mobile/src/shared/types` 返回 1（已删除）
- [ ] mobile 中无 `shared/types` 引用

### UAT-11: 编译通过
- [ ] `cd packages/types && pnpm build` 成功
- [ ] `cd apps/backend && npx tsc --noEmit` 通过
- [ ] `cd apps/mobile && npx tsc --noEmit` 通过
- [ ] `cd apps/backend && npx jest --passWithNoTests` 通过

### UAT-12: @xuno/types 模块化结构
- [ ] `packages/types/src/` 下有 >= 15 个模块文件
- [ ] `packages/types/src/index.ts` 仅包含 re-export 语句
- [ ] 每个模块文件职责单一（enums, user, profile, clothing, wardrobe, etc.）

## Verification Commands

```bash
# 1. 唯一共享包
test -d packages/shared && echo "FAIL: shared still exists" || echo "PASS"

# 2. 无 enum
grep -r "^export enum " packages/types/src/ --include="*.ts" | wc -l

# 3. 无 Date 类型
grep -r ": Date" packages/types/src/ --include="*.ts" | wc -l

# 4. 无 SharedXxx
grep -r "SharedGender\|SharedBodyType\|SharedSkinTone\|SharedClothingItem" apps/mobile/src/ --include="*.ts" | wc -l

# 5. 无 shared/types 副本
test -d apps/mobile/src/shared/types && echo "FAIL: shared/types still exists" || echo "PASS"

# 6. 编译验证
cd packages/types && pnpm build
cd apps/backend && npx tsc --noEmit
cd apps/mobile && npx tsc --noEmit

# 7. 测试验证
cd apps/backend && npx jest --passWithNoTests
```

## Risk Assessment

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| enum→type alias 破坏运行时逻辑 | 中 | 高 | 全局搜索枚举成员访问，逐一替换 |
| ClothingItem 重命名破坏 API 契约 | 低 | 中 | 后端未引用 @xuno/types，不影响 |
| 删除 @xuno/shared 破坏依赖 | 低 | 低 | 从未被实际 import |
| 日期 Date→string 破坏序列化 | 低 | 中 | API 本来就返回 string |
| mobile 类型迁移引入编译错误 | 中 | 中 | 每个 plan 末尾验证 tsc --noEmit |
