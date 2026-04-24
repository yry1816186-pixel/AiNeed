# 轨道 4: 后端安全修复 + PIPL 合规 + 体正面措辞

你是 XUNO 项目的安全工程师。你的任务有 3 个：(1)修复密钥泄露，(2)实现 PIPL 合规 API，(3)注入体正面措辞。

## 任务 1: 密钥轮换

### 立即执行

文件: `apps/backend/.env`

1. 生成新的 JWT_SECRET（64 hex 字符）
2. 生成新的 ENCRYPTION_KEY（64 hex 字符）
3. 更新数据库密码
4. 更新 Redis 密码

```bash
# 在bash中执行：
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))" # 新JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" # 新ENCRYPTION_KEY
```

4. 确认 `.gitignore` 包含 `.env`

### .env.example 清理

文件: `apps/backend/.env.example`

- 所有敏感值替换为占位符：`JWT_SECRET=your-jwt-secret-min-64-hex-chars`
- 添加注释：`# Never commit real values`

## 任务 2: PIPL 合规同意机制

### 新增 Consent API 端点

文件: `apps/backend/src/domains/identity/consent/consent.controller.ts`

```typescript
@Controller("consent")
export class ConsentController {
  // 记录用户对特定数据类型的同意
  @Post("record")
  async recordConsent(@Body() dto: RecordConsentDto, @CurrentUser() user: User) {
    // consentType: 'body_measurement' | 'photo_processing' | 'body_type_classification' | 'ai_recommendation' | 'tracking'
    return this.consentService.record(user.id, dto.consentType, dto.granted);
  }

  // 查询用户的同意状态
  @Get("status")
  async getConsentStatus(@CurrentUser() user: User) {
    return this.consentService.getStatus(user.id);
  }

  // 撤回同意
  @Post("withdraw")
  async withdrawConsent(@Body() dto: WithdrawConsentDto, @CurrentUser() user: User) {
    return this.consentService.withdraw(user.id, dto.consentType);
  }
}
```

### Onboarding 中的同意收集

文件: `apps/backend/src/domains/identity/onboarding/onboarding.service.ts`

在 Onboarding 的每一步，当收集敏感数据时调用同意记录：

```typescript
// Step 2: 收集身高体重时
await this.consentService.record(userId, "body_measurement", true);

// Step 3: 如果用户上传照片
await this.consentService.record(userId, "photo_processing", true);

// Step 4: 生成AI推荐时
await this.consentService.record(userId, "ai_recommendation", true);
```

### 数据最小化

Onboarding 中的身体测量字段改为按需收集：

```typescript
// OnboardingOutput中body measurements改为可选
interface OnboardingOutput {
  profile: {
    height?: number; // 可选
    weight?: number; // 可选
    shoulder?: number; // 可选，仅在使用需要的功能时收集
    bust?: number; // 同上
    waist?: number; // 同上
    hip?: number; // 同上
  };
}
```

## 任务 3: 关闭个性化推荐选项

文件: `apps/backend/src/domains/identity/preferences/preferences.controller.ts`

```typescript
@Patch('recommendation-settings')
async updateRecommendationSettings(
  @Body() dto: RecommendationSettingsDto,
  @CurrentUser() user: User
) {
  // personalizationEnabled: boolean
  // 当用户关闭个性化推荐时，使用通用推荐（不使用用户画像数据）
  return this.preferencesService.updateSettings(user.id, dto);
}
```

## 任务 4: 修复 avoidStyles 违规

文件: `apps/backend/src/domains/identity/profile/profile.controller.ts`

第 204-223 行的 MVP 占位数据中 `avoidStyles` 字段违反决策#36。

修改为：

```typescript
return {
  bodyType: "rectangle",
  bodyTypeName: "矩形体型",
  description: "基于上传照片的体型分析结果（MVP 占位）",
  recommendStyles: ["structured_blazer", "v_neck_tops", "straight_leg_pants"], // 改为推荐什么
  // 删除 avoidStyles
};
```

## 验收标准

1. `.env` 中所有密钥已轮换，`.env.example` 只有占位符
2. `.gitignore` 包含 `.env`
3. `POST /api/consent/record` 能记录 5 种同意类型
4. `GET /api/consent/status` 返回用户的同意状态
5. profile controller 不再有 `avoidStyles` 字段
6. 存在关闭个性化推荐的端点
