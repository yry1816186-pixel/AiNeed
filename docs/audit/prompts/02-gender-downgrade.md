# 轨道 2: 后端+移动端性别降级全量

你是 XUNO 项目的全栈工程师。你的任务是在整个代码库中将 gender 字段从必填降级为可选，并将所有 gender-based 逻辑替换为 bodyType+styleExpression。

## 当前问题

1. `apps/backend/src/domains/identity/auth/dto/auth.dto.ts` 第 289-291 行 `PhoneRegisterDto` 中 gender 是 `@IsNotEmpty()` 必填
2. `apps/backend/src/domains/platform/recommendations/services/cold-start.service.ts` 第 35-64 行按 male/female 分桶
3. 后端 15 个文件引用 gender 字段
4. 移动端 15 个文件引用 gender 字段

## 目标

gender 字段变为完全可选（@IsOptional()），所有推荐逻辑改为基于 bodyType + garmentPreference + styleExpression。

## 具体修改指令

### 后端修改

#### 1. auth.dto.ts

文件: `apps/backend/src/domains/identity/auth/dto/auth.dto.ts`

- `PhoneRegisterDto`: gender 改为 `@IsOptional() @IsEnum(Gender)`
- `EmailRegisterDto`: 同上
- `WechatRegisterDto`: 同上

#### 2. cold-start.service.ts

文件: `apps/backend/src/domains/platform/recommendations/services/cold-start.service.ts`

- 删除 `demographicRules` 中的 male/female 分桶
- 改为基于 bodyType (apple/pear/hourglass/rectangle/inverted-triangle) 的规则映射
- 改为基于 styleExpression (minimalist/classic/romantic/edgy/casual/sporty) 的风格偏好映射
- `getDemographicRecommendations()` → `getProfileBasedRecommendations(profile: UserProfile)`

#### 3. onboarding.dto.ts

文件: `apps/backend/src/domains/identity/onboarding/dto/onboarding.dto.ts`

- gender 改为可选
- 添加 primaryScenarios: string[] (必填)
- 添加 styleExpression: string[] (必填)
- garmentPreference.lowerBody: 'pants' | 'skirts' | 'both' (必填)

#### 4. onboarding.service.ts

文件: `apps/backend/src/domains/identity/onboarding/onboarding.service.ts`

- 处理 Onboarding 完成时，如果 gender 未提供，不报错
- ColdStart 推荐调用改为使用新的 `getProfileBasedRecommendations()`

#### 5. 全面搜索

在 `apps/backend/src/` 中搜索所有 `gender` 引用：

```bash
grep -rn "gender" --include="*.ts" --include="*.tsx" apps/backend/src/
```

对每个引用：

- 如果是 DTO/Interface 定义：改为可选 (@IsOptional)
- 如果是推荐逻辑中的条件判断：改为基于 bodyType/styleExpression
- 如果是数据库查询条件：gender 改为可选过滤
- 如果是日志/统计：gender 可以为 null

### 移动端修改

#### 6. onboardingStore.ts

文件: `apps/mobile/src/features/onboarding/stores/onboardingStore.ts`

- gender 改为可选字段
- 添加 primaryScenarios, styleExpression, garmentPreference

#### 7. profile.api.ts

文件: 搜索所有 `.api.ts` 中的 gender 引用

- 注册/更新 Profile 的 API 调用中 gender 改为可选

#### 8. 全面搜索

在 `apps/mobile/src/` 中搜索所有 `gender` 引用：

```bash
grep -rn "gender" --include="*.ts" --include="*.tsx" apps/mobile/src/
```

## 接口契约

OnboardingOutput:

```typescript
interface OnboardingOutput {
  userId: string;
  profile: {
    primaryScenarios: string[];
    ageBand: "18-24" | "25-34" | "35+";
    styleExpression: string[];
    bodyType?: string;
    colorSeason?: string;
    garmentPreference: {
      lowerBody: "pants" | "skirts" | "both";
      upperFit: "fitted" | "regular" | "loose";
    };
  };
  initialRecommendations: RecommendationOutput;
}
```

## 验收标准

1. `grep -rn "gender" apps/backend/src/ --include="*.ts"` 返回的结果中，没有 `@IsNotEmpty()` 或必填 gender
2. `grep -rn "gender" apps/mobile/src/ --include="*.ts" --include="*.tsx"` 返回的结果中，没有必填 gender
3. cold-start.service.ts 不再有 male/female 字符串
4. 后端 `npx tsc --noEmit` 0 错误
5. 移动端 TS 错误不增加

## 注意事项

- 数据库中的 gender 列保留（向后兼容），只是不再必填
- Prisma schema 中的 gender 字段加 `?` 变为可选
- 已注册用户的 gender 数据保留，不影响
