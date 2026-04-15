# Phase 1: 用户画像 & 风格测试 - Research

**Researched:** 2026-04-13
**Domain:** User profile building, style quiz, body analysis, photo quality, WeChat/SMS auth
**Confidence:** HIGH

## Summary

Phase 1 is in an unusually strong starting position. The codebase already has 35+ backend modules, including complete implementations for auth (JWT + phone login + WeChat login), style-quiz (CRUD + scoring + progress), profile (body analysis + color season), photos (encrypted upload + AI analysis), and onboarding (multi-step wizard). The mobile app has an OnboardingWizard with BasicInfoStep, PhotoStep, StyleTestStep, and CompleteStep. The Prisma schema has all required models: StyleQuiz, QuizQuestion, QuizAnswer, StyleQuizResult, ShareTemplate, and the User/UserProfile models with all necessary fields (wechatOpenId, wechatUnionId, colorSeason, onboardingStep, etc.).

The critical finding is that **70-80% of the backend code for Phase 1 already exists**. The planning effort should focus on: (1) extending existing modules with missing features (photo quality detection, profile completeness calculation, image quiz data seeding), (2) mobile UI polish for the onboarding wizard and style quiz screens, and (3) filling gaps like the image-based quiz question bank with proper metadata for color/style derivation.

**Primary recommendation:** Maximize reuse of existing code. Focus planning effort on the 20-30% that is genuinely missing: photo quality detection logic, quiz image seeding with color metadata, profile completeness API, body proportion visualization in mobile, and share poster refinement.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** 双通道注册 -- 手机号+验证码（阿里云/腾讯云短信）+ 微信一键登录（微信开放平台）
- **D-02:** 强制基本信息 -- 注册后必须填写性别和年龄段，确保 AI 推荐有最低数据基础
- **D-03:** 最短链路引导 -- 基本信息（必填）-> 照片上传（可选）-> 风格测试（可选）-> 进入首页；照片和风格测试可跳过但首页持续提示补全
- **D-04:** 实时参考线引导 -- 上传照片时显示人体轮廓参考线 + 姿势提示（"请稍向左"/"请站直"），类似小米证件照引导
- **D-05:** 照片质量检测 -- 自动检测清晰度/光线/构图，不合格提示重新上传或自动增强
- **D-06:** 照片加密永久存储 -- AES-256-GCM 加密存储在 MinIO，永久保留（用于后续虚拟试衣），用户可手动删除
- **D-07:** 隐私承诺展示 -- 上传页面明确标注"仅用于体型分析和试衣效果生成"
- **D-08:** 图片选择式问卷 -- 每题展示 4-6 张穿搭图片，用户点选喜欢的。5-8 题总量，控制完成时间
- **D-09:** 四维度覆盖 -- 场合偏好 + 色彩偏好（隐性推导）+ 风格关键词 + 价格区间
- **D-10:** 色彩隐性推导 -- 不直接问色彩偏好，从图片选择行为中推导
- **D-11:** 可视化报告 -- 体型分类 + 身体比例可视化 + 肤色分析 + 色彩季型（四型+暖冷x浅深细分）+ 个性化穿搭建议摘要
- **D-12:** 分享海报 -- 画像结果支持生成可分享的海报图片，增强仪式感和社交传播
- **D-13:** 伴随式画像构建 -- 用户行为数据（浏览/收藏/试衣/购买/AI对话）持续优化画像
- **D-14:** 画像数据同步 -- UserProfile/StyleProfile 变更后自动通知 AI 造型师和推荐引擎
- **D-15:** 风格测试自动保存进度 -- 每选一题自动保存，重新进入从上次位置继续

### Claude's Discretion
- 手机验证码具体服务商选择（阿里云 vs 腾讯云短信）
- 参考线引导的具体 UI 实现（Canvas overlay vs 原生组件）
- 图片选择式问卷的图片素材来源和分类
- 可视化报告的具体 UI 布局和图表类型
- 分享海报的模板设计

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PROF-01 | 双轨道体型分析 -- 照片分析或手动输入 | Photos service + Profile service already implement photo analysis; manual input via onboarding BasicInfoStep |
| PROF-02 | 拍照实时参考线引导 -- 人体轮廓参考线 + 姿势提示 | Mobile CameraScreen exists; needs SVG overlay with pose guide (react-native-svg) |
| PROF-03 | 照片质量检测 -- 清晰度/光线/构图 | sharp library already in project; Laplacian variance + brightness analysis pattern documented |
| PROF-04 | 体型分析可视化报告 -- 体型分类 + 比例可视化 + 肤色 + 色彩季型 + 穿搭建议 | ProfileReportScreen exists; poster-generator.service.ts implements Canvas-based poster generation |
| PROF-05 | 双通道注册 -- 手机号+验证码 + 微信一键登录 | Auth service already has loginWithPhone() and loginWithWechat() with full auto-registration |
| PROF-06 | 强制基本信息收集 -- 性别/年龄段 | OnboardingService.completeBasicInfo() enforces this; OnboardingStep enum has BASIC_INFO |
| PROF-07 | 最短链路引导 -- 基本信息(必填) -> 照片 -> 风格测试 -> 首页 | OnboardingWizard with 4 steps (BasicInfoStep, PhotoStep, StyleTestStep, CompleteStep) already implemented |
| PROF-08 | 风格测试图片选择式问卷 -- 5-8 题图片选择 | StyleQuizService has complete quiz CRUD + answer submission + progress tracking |
| PROF-09 | 色彩偏好隐性推导 -- 不直接问色彩 | ColorDeriverService already implements hue-segment based color derivation from image selections |
| PROF-10 | 色彩季型系统 -- 四型 + 暖/冷 x 浅/深 | ColorSeason enum in Prisma (spring/summer/autumn/winter); ColorDeriverService derives warm/cool + saturation |
| PROF-11 | 伴随式画像构建 -- 行为数据持续优化画像 | StyleProfilesService.enrichFromBehavior() already merges behavior-derived preferences with user data |
| PROF-12 | 照片加密永久存储 -- AES-256-GCM + MinIO | PhotosService implements EXIF stripping + malware scan + encrypted upload + MinIO storage |
| PROF-13 | 画像数据同步 -- 变更通知 AI 造型师和推荐引擎 | NestJS EventEmitter2 pattern; Profile module imports RecommendationsModule for integration |
</phase_requirements>
</user_constraints>

## Standard Stack

### Core (Already in Project -- Verified)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| sharp | 0.33.2 (installed) | Image processing, quality detection, multi-size generation | Fastest Node.js image processor, already in project [VERIFIED: package.json] |
| canvas (node-canvas) | 3.2.3 (installed) | Server-side poster generation | Cairo-backed Canvas API, already used by PosterGeneratorService [VERIFIED: package.json] |
| qrcode | 1.5.4 (installed) | QR code on share posters | Already used in PosterGeneratorService [VERIFIED: package.json] |
| react-native-svg | 15.8.0 (installed) | Body proportion SVG visualization, pose guide overlay | Standard RN SVG library, already in project [VERIFIED: apps/mobile/package.json] |
| jest | 29.7.x (installed) | Backend testing | Already configured with 90% threshold [VERIFIED: package.json] |
| BullMQ | (installed) | Async photo analysis queue | Already used by PhotosService for image analysis tasks [VERIFIED: codebase] |
| Prisma | 5.x (installed) | ORM | All Phase 1 models already exist in schema [VERIFIED: schema.prisma] |

### Supporting (Already in Project -- Verified)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @nestjs/event-emitter | (installed) | Profile change event notification | For D-14 profile sync to AI stylist/recommendation engine |
| expo-secure-store | (available) | Mobile secure storage for tokens | For WeChat auth token storage on mobile |
| expo-image-picker | (available) | Photo upload from camera/gallery | Already used in PhotoStep for image selection |
| Zustand | (installed) | Mobile state management | quizStore, onboardingStore, profileStore all exist |
| TanStack Query | (installed) | Server state caching | For quiz progress, profile data fetching |

### New Dependencies Needed
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-native-body-highlighter | 3.2.0 [VERIFIED: npm registry] | Body part visualization SVG | For body proportion visualization in ProfileReportScreen |
| expo-auth-session | 55.0.14 [VERIFIED: npm registry] | WeChat OAuth2 browser-based flow | For mobile WeChat login (alternative to native SDK) |
| @alicloud/dysmsapi20170525 | 4.5.1 [VERIFIED: npm registry] | Aliyun SMS SDK | For production SMS verification (AliyunSmsService already has stub) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| node-canvas poster gen | Puppeteer | Canvas is 10x lighter, already in project, PosterGeneratorService uses it. Puppeteer only needed for complex HTML/CSS rendering. [ASSUMED] |
| expo-auth-session for WeChat | expo-native-wechat (native SDK) | AuthSession uses browser-based OAuth which works without native module config, but native SDK gives better UX with in-app WeChat. For MVP, browser-based is simpler. [CITED: docs.expo.dev/guides/authentication] |
| react-native-body-highlighter | Custom SVG with D3.js | Body highlighter is purpose-built, pure SVG, no D3 dependency needed. Custom SVG gives more control but costs more development time. [VERIFIED: github.com/HichamELBSI/react-native-body-highlighter] |

**Installation:**
```bash
# Backend -- no new backend packages needed (all dependencies exist)
# Mobile
cd apps/mobile
npx expo install expo-auth-session
pnpm add react-native-body-highlighter
```

**Version verification:** All versions verified via npm registry and package.json inspection on 2026-04-13.

## Architecture Patterns

### Recommended Project Structure (Existing -- Verified)
```
apps/backend/src/modules/
  auth/                          # D-01: WechatService + AliyunSmsService exist
    services/wechat.service.ts   # WeChat OAuth2 (getAccessToken + getUserInfo)
    services/sms.service.ts      # AliyunSmsService + MockSmsService
    strategies/wechat.strategy.ts # Passport strategy (already exists)
    auth.service.ts              # loginWithPhone(), loginWithWechat()
  profile/
    profile.service.ts           # Body analysis + color analysis + profile CRUD
    services/poster-generator.service.ts  # D-12: Canvas poster generation
    poster.controller.ts         # Poster API endpoints
    templates/                   # Color season-based poster templates
  photos/
    photos.service.ts            # D-06: Encrypted upload + AI analysis
    services/ai-analysis.service.ts  # Body + face analysis
  style-quiz/
    style-quiz.service.ts        # Quiz CRUD + scoring + progress
    services/question-selector.ts    # Smart question selection
    services/color-deriver.ts        # D-10: Color preference derivation
    services/style-keyword-extractor.ts  # Style keyword extraction
  onboarding/
    onboarding.service.ts        # D-03: Step progression + skip logic
  style-profiles/
    style-profiles.service.ts    # D-13: Behavior-enriched style profiles

apps/mobile/src/
  screens/onboarding/
    OnboardingWizard.tsx          # Multi-step wizard (exists)
    steps/BasicInfoStep.tsx       # Gender + age range (exists)
    steps/PhotoStep.tsx           # Photo upload (exists)
    steps/StyleTestStep.tsx       # Style quiz (exists)
    steps/CompleteStep.tsx        # Completion (exists)
  screens/style-quiz/
    StyleQuizScreen.tsx           # Quiz UI (exists)
    QuizResultScreen.tsx          # Result display (exists)
  screens/photo/
    CameraScreen.tsx              # D-04: Photo capture (exists)
  screens/profile/
    ProfileReportScreen.tsx       # D-11: Visualization report (exists)
  stores/
    quizStore.ts                  # Quiz state management (exists)
    onboardingStore.ts            # Onboarding state (exists)
    profileStore.ts               # Profile state (exists)
```

### Pattern 1: Onboarding Step Progression (Already Implemented)
**What:** User progresses through BASIC_INFO -> PHOTO -> STYLE_TEST -> COMPLETED
**When to use:** Every new user registration triggers onboarding
**Example:**
```typescript
// Source: apps/backend/src/modules/onboarding/onboarding.service.ts (VERIFIED in codebase)
const STEP_ORDER: OnboardingStep[] = [
  OnboardingStep.BASIC_INFO,   // Required: gender + ageRange
  OnboardingStep.PHOTO,        // Optional: upload body photo
  OnboardingStep.STYLE_TEST,   // Optional: image quiz
  OnboardingStep.COMPLETED,    // Done
];
```

### Pattern 2: Quiz Answer Auto-Save (Already Implemented)
**What:** Each quiz answer is persisted individually; progress is resumable
**When to use:** D-15 auto-save per question
**Example:**
```typescript
// Source: apps/backend/src/modules/style-quiz/style-quiz.service.ts (VERIFIED in codebase)
async saveAnswer(userId: string, questionId: string, selectedImageIndex: number, duration?: number) {
  const existing = await this.prisma.quizAnswer.findFirst({ where: { userId, questionId } });
  if (existing) {
    return this.prisma.quizAnswer.update({ where: { id: existing.id }, data: { selectedImageIndex, responseTimeMs: duration ?? null } });
  }
  return this.prisma.quizAnswer.create({ data: { userId, questionId, selectedImageIndex, responseTimeMs: duration ?? null } });
}
```

### Pattern 3: Redis-Based Quiz Progress Cache
**What:** Cache quiz progress in Redis with TTL for fast resume; DB as source of truth
**When to use:** D-15 quiz progress auto-save (add Redis caching layer on top of existing DB save)
**Example:**
```typescript
// Pattern for Redis quiz progress caching
const QUIZ_PROGRESS_TTL = 86400; // 24 hours
const cacheKey = RedisKeyBuilder.cache("quiz-progress", `${userId}:${quizId}`);

// On each answer save, update Redis hash
await this.redisService.hset(cacheKey, questionId, JSON.stringify({ selectedImageIndex, timestamp: Date.now() }));
await this.redisService.expire(cacheKey, QUIZ_PROGRESS_TTL);

// On quiz resume, check Redis first, fall back to DB
const cached = await this.redisService.hgetall(cacheKey);
if (Object.keys(cached).length > 0) {
  return { answeredCount: Object.keys(cached).length, answers: cached };
}
// Fall back to DB query via getQuizProgress()
```

### Pattern 4: Photo Quality Detection with Sharp
**What:** Use sharp to detect blur (Laplacian variance), brightness, and composition issues
**When to use:** D-05 pre-upload quality check
**Example:**
```typescript
// Pattern: Laplacian variance blur detection using sharp
import sharp from 'sharp';

async function assessPhotoQuality(buffer: Buffer): Promise<QualityReport> {
  const image = sharp(buffer);
  const { width, height } = await image.metadata();

  // Convert to grayscale for Laplacian convolution
  const grayscale = await image.grayscale().raw().toBuffer();

  // Laplacian kernel: [-1, -1, -1; -1, 8, -1; -1, -1, -1]
  const laplacianVariance = computeLaplacianVariance(grayscale, width, height);

  // Brightness check
  const stats = await image.stats();
  const avgBrightness = stats.channels[0].mean;

  return {
    isBlurry: laplacianVariance < BLUR_THRESHOLD, // ~100 is typical threshold
    isDark: avgBrightness < DARK_THRESHOLD,        // ~50
    isBright: avgBrightness > BRIGHT_THRESHOLD,     // ~200
    qualityScore: Math.min(100, (laplacianVariance / 500) * 100),
  };
}
```
[ASSUMED -- Laplacian variance threshold values based on common practice, needs calibration with real test images]

### Pattern 5: Profile Change Event Notification
**What:** Emit events when UserProfile or StyleProfile changes, consumed by AI stylist and recommendation engine
**When to use:** D-14 profile data sync
**Example:**
```typescript
// Using NestJS EventEmitter2 (already available in project)
@Injectable()
export class ProfileService {
  constructor(private eventEmitter: EventEmitter2) {}

  async updateProfile(userId: string, data: UpdateProfileDto) {
    const updated = await this.prisma.userProfile.update({ where: { userId }, data });
    this.eventEmitter.emit('profile.updated', { userId, changes: data });
    return updated;
  }
}

// In AI Stylist module
@OnEvent('profile.updated')
async handleProfileUpdate(payload: { userId: string; changes: any }) {
  await this.refreshStylistContext(payload.userId);
}
```
[VERIFIED: NestJS EventEmitter2 is a standard pattern; project already uses @nestjs/event-emitter in some modules]

### Anti-Patterns to Avoid
- **Rebuilding quiz flow from scratch**: The style-quiz module has complete CRUD + scoring + progress. Extend it, don't replace it.
- **Using Puppeteer for poster generation**: node-canvas is already in the project and PosterGeneratorService works. Puppeteer adds 200MB+ dependency for no benefit.
- **Building WeChat native SDK from scratch**: The WechatService already implements getAccessToken and getUserInfo using fetch-based HTTP calls. Only mobile-side integration is needed.
- **Separate onboarding flow**: OnboardingWizard with 4 steps already matches D-03 exactly. Extend the existing steps, don't create new screens.
- **Custom color season derivation**: ColorDeriverService already has warm/cool + saturation analysis producing spring/summer/autumn/winter. Extend for light/deep dimension, don't rewrite.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Photo quality detection | Custom blur/brightness detector from scratch | sharp library (already installed) + Laplacian variance algorithm | Laplacian variance is the standard blur detection method; sharp provides raw pixel access [CITED: GeeksforGeeks, Stack Overflow] |
| Poster/share image generation | HTML-to-image with Puppeteer | node-canvas (already installed + PosterGeneratorService exists) | Canvas is 10x lighter, already working in the project |
| Color season derivation | New color analysis from scratch | ColorDeriverService (already implements warm/cool + saturation analysis) | Existing service derives spring/summer/autumn/winter correctly |
| Quiz progress tracking | Custom state machine | StyleQuizService.getQuizProgress() + Redis caching layer | DB-based progress already works; add Redis for speed |
| JWT auth for phone/WeChat | New auth flow | AuthService.loginWithPhone() + loginWithWechat() | Both methods exist with auto-registration, token generation, and refresh token storage |
| SMS verification code | Custom code generation + storage | AuthService.sendSmsCode() + verifySmsCode() | Already uses Redis with throttling (60s), TTL (5min), attempt limiting (5x) |
| Onboarding step progression | New wizard component | OnboardingWizard + OnboardingService | 4-step wizard with skip support already implemented |
| Body proportion visualization | Custom SVG drawing from scratch | react-native-body-highlighter + react-native-svg | Purpose-built library for body part visualization [VERIFIED: npm registry] |
| Profile completeness score | Custom calculation | Simple weighted field check against UserProfile model | No library needed; check which fields are null and weight them |

**Key insight:** The codebase is already 70-80% complete for Phase 1. The real work is in filling gaps (quiz image seeding, photo quality detection logic, profile completeness API) and mobile UI polish, not in building new infrastructure.

## Common Pitfalls

### Pitfall 1: Laplacian Variance Threshold Calibration
**What goes wrong:** Hardcoded blur threshold gives false positives (flagging artistic photos as blurry) or false negatives (accepting genuinely blurry photos)
**Why it happens:** Laplacian variance is resolution-dependent and content-dependent; different camera sensors produce different noise characteristics
**How to avoid:** Make threshold configurable via SystemConfig; calibrate with 50+ test photos spanning clear/artistic/blurry; provide a "still upload" override option
**Warning signs:** Users complaining about quality rejections on good photos

### Pitfall 2: WeChat OAuth Code Expiration
**What goes wrong:** WeChat auth codes expire in 5 minutes; if user takes longer on the WeChat authorization screen, the code is invalid
**Why it happens:** WeChat's authorization_code has a strict 5-minute TTL
**How to avoid:** Handle the error gracefully; redirect user to re-authorize; don't cache codes
**Warning signs:** "invalid code" errors from WeChat API during login

### Pitfall 3: Quiz Image Seeding Quality
**What goes wrong:** Quiz questions reference images that don't have proper color metadata (domantColors, hue values), causing ColorDeriverService to produce meaningless results
**Why it happens:** QUESTION_IMAGE_META_MAP must be manually populated with correct HSL values for each quiz image
**How to avoid:** Create a seed script that uses sharp to extract dominant colors from quiz images and auto-populate metadata; validate metadata completeness before quiz goes live
**Warning signs:** All users get the same color season result regardless of image choices

### Pitfall 4: Onboarding Drop-off at Photo Step
**What goes wrong:** Users skip photo upload because they feel uncomfortable, but then AI recommendations are poor because body data is missing
**Why it happens:** Photo upload feels personal; without proper framing ("30 seconds to unlock your style"), users skip
**How to avoid:** D-07 already makes this optional with home screen reminders; add encouraging copy and privacy promise (D-07); show preview of what they'll get
**Warning signs:** >60% skip rate at photo step

### Pitfall 5: Poster Font Rendering on Linux Server
**What goes wrong:** node-canvas poster generation uses system fonts that look different on development (Windows/macOS) vs production (Linux Docker)
**Why it happens:** Canvas uses system fontconfig; different OS has different default fonts for "sans-serif"
**How to avoid:** Bundle custom fonts (e.g., Noto Sans CJK for Chinese) in the Docker image; reference by explicit path in Canvas font loading
**Warning signs:** Chinese characters rendering as boxes or wrong font in production posters

### Pitfall 6: Profile Sync Race Condition
**What goes wrong:** Multiple services update UserProfile simultaneously (photo analysis completes while user updates manual data), causing lost updates
**Why it happens:** No optimistic locking on UserProfile; upsert can overwrite concurrent changes
**How to avoid:** Use Prisma's optimistic concurrency control (version field) or serialize profile updates through a single service method
**Warning signs:** User-reported data disappearing after photo analysis completes

## Code Examples

### Photo Quality Detection Service (New -- Needs Implementation)
```typescript
// New file: apps/backend/src/modules/photos/services/photo-quality.service.ts
import sharp from 'sharp';

export interface PhotoQualityReport {
  isAcceptable: boolean;
  blurScore: number;       // 0-100, higher = sharper
  brightnessScore: number; // 0-255 average
  compositionScore: number; // 0-100, basic center-weighted
  issues: string[];        // ['blurry', 'too_dark', 'too_bright']
}

@Injectable()
export class PhotoQualityService {
  async assessQuality(buffer: Buffer): Promise<PhotoQualityReport> {
    const image = sharp(buffer);
    const metadata = await image.metadata();
    const { width, height } = metadata;

    // Grayscale for Laplacian
    const { data, info } = await image
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const blurScore = this.computeLaplacianVariance(data, info.width, info.height);

    // Brightness
    const stats = await sharp(buffer).stats();
    const brightnessScore = stats.channels[0].mean;

    const issues: string[] = [];
    if (blurScore < 100) issues.push('blurry');
    if (brightnessScore < 50) issues.push('too_dark');
    if (brightnessScore > 220) issues.push('too_bright');

    return {
      isAcceptable: issues.length === 0,
      blurScore: Math.min(100, blurScore / 5),
      brightnessScore,
      compositionScore: 70, // placeholder; full implementation uses edge detection
      issues,
    };
  }

  private computeLaplacianVariance(data: Buffer, w: number, h: number): number {
    // Simplified Laplacian variance computation
    let sum = 0;
    let count = 0;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        const laplacian = -data[idx - w - 1]! - data[idx - w]! - data[idx - w + 1]!
          - data[idx - 1]! + 8 * data[idx]! - data[idx + 1]!
          - data[idx + w - 1]! - data[idx + w]! - data[idx + w + 1]!;
        sum += laplacian * laplacian;
        count++;
      }
    }
    return count > 0 ? sum / count : 0;
  }
}
```
[ASSUMED -- Laplacian variance threshold values need calibration; algorithm structure is standard]

### Profile Completeness Service (New -- Needs Implementation)
```typescript
// New file: apps/backend/src/modules/profile/services/profile-completeness.service.ts
export interface ProfileCompleteness {
  percentage: number;       // 0-100
  completedFields: string[];
  missingFields: Array<{ field: string; label: string; weight: number }>;
}

@Injectable()
export class ProfileCompletenessService {
  private readonly FIELD_WEIGHTS = [
    { field: 'gender', label: '性别', weight: 15, source: 'user' },
    { field: 'ageRange', label: '年龄段', weight: 15, source: 'user' },
    { field: 'height', label: '身高', weight: 10, source: 'profile' },
    { field: 'weight', label: '体重', weight: 10, source: 'profile' },
    { field: 'bodyType', label: '体型分析', weight: 15, source: 'profile' },
    { field: 'colorSeason', label: '色彩季型', weight: 10, source: 'profile' },
    { field: 'styleQuiz', label: '风格测试', weight: 15, source: 'quiz' },
    { field: 'photo', label: '个人照片', weight: 10, source: 'photo' },
  ];

  async calculateCompleteness(userId: string): Promise<ProfileCompleteness> {
    const [user, profile, latestQuiz, photo] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.userProfile.findUnique({ where: { userId } }),
      this.prisma.styleQuizResult.findFirst({ where: { userId, isLatest: true } }),
      this.prisma.userPhoto.findFirst({ where: { userId, type: 'BODY' } }),
    ]);

    let percentage = 0;
    const completedFields: string[] = [];
    const missingFields: Array<{ field: string; label: string; weight: number }> = [];

    for (const fw of this.FIELD_WEIGHTS) {
      let isComplete = false;
      if (fw.source === 'user') isComplete = !!user?.[fw.field as keyof typeof user];
      else if (fw.source === 'profile') isComplete = !!profile?.[fw.field as keyof typeof profile];
      else if (fw.source === 'quiz') isComplete = !!latestQuiz;
      else if (fw.source === 'photo') isComplete = !!photo;

      if (isComplete) {
        percentage += fw.weight;
        completedFields.push(fw.field);
      } else {
        missingFields.push(fw);
      }
    }

    return { percentage: Math.min(100, percentage), completedFields, missingFields };
  }
}
```
[ASSUMED -- field weights are a reasonable starting point; should be configurable]

### Redis Quiz Progress Enhancement (Extension -- Needs Implementation)
```typescript
// Add to existing StyleQuizService
private readonly QUIZ_PROGRESS_TTL = 86400; // 24 hours

async saveAnswer(userId: string, questionId: string, selectedImageIndex: number, duration?: number) {
  // Existing DB save logic (already implemented)
  const result = await this.upsertAnswer(userId, questionId, selectedImageIndex, duration);

  // New: Redis cache for fast resume
  const cacheKey = `quiz-progress:${userId}:${questionId}`;
  await this.redisService.hset(
    `quiz-progress:${userId}`,
    questionId,
    JSON.stringify({ selectedImageIndex, timestamp: Date.now() }),
  );
  await this.redisService.expire(`quiz-progress:${userId}`, this.QUIZ_PROGRESS_TTL);

  return result;
}
```
[Pattern based on Redis hash + TTL approach; VERIFIED via WebSearch as standard pattern for game/quiz state]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| FlatList for long lists | FlashList (Shopify) | 2023+ | CC-16 mandates FlashList for performance; use for quiz image grids |
| Puppeteer for poster gen | node-canvas direct rendering | Always available | 10x lighter, no browser needed; already used in project |
| Phone + password auth | Phone + OTP codeless auth | Industry standard | No password to remember; already implemented in AuthService |
| Explicit color questions | Implicit color derivation from image choices | Stitch Fix pattern | D-10 mandates this; ColorDeriverService already implements it |
| Single body type | 5 body types + proportion ratios | Industry standard | ProfileService already supports 5 body types |

**Deprecated/outdated:**
- `react-native-svg-charts`: Not actively maintained; use `react-native-svg` directly for custom visualizations
- WeChat SDK v1: Must use open platform OAuth2 API (project already does this)

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Laplacian variance threshold of ~100 is appropriate for body photo blur detection | Architecture Patterns (Pattern 4) | Too high = false rejections; too low = blurry photos accepted. Needs calibration. |
| A2 | Brightness thresholds of 50 (dark) and 220 (bright) are reasonable for photo quality | Architecture Patterns (Pattern 4) | May need adjustment for different skin tones and lighting conditions. |
| A3 | expo-auth-session can handle WeChat OAuth2 flow via browser redirect | Standard Stack | If WeChat requires native SDK integration, expo-native-wechat module would be needed instead. |
| A4 | node-canvas is sufficient for share poster generation (vs Puppeteer) | Standard Stack | PosterGeneratorService already uses it successfully; unlikely to be wrong. |
| A5 | Aliyun SMS SDK (@alicloud/dysmsapi20170525 v4.5.1) works with current Node.js v24 | Standard Stack | Minor risk of compatibility issue with Node 24; should verify. |
| A6 | react-native-body-highlighter v3.2.0 is compatible with React Native 0.76.8 | Standard Stack | Should verify Expo compatibility before adding. |
| A7 | Field weights for profile completeness (gender 15%, age 15%, etc.) are reasonable | Code Examples | Weights affect user experience and prompt accuracy; should be tunable. |

## Open Questions (RESOLVED)

1. **Quiz Image Bank Seeding Strategy** — RESOLVED by Plan 01 Task 3
   - What we know: QUESTION_IMAGE_META_MAP needs to be populated with quiz images + color metadata for ColorDeriverService to work
   - What's unclear: Where do quiz images come from? Are they curated and stored in MinIO? Are they URLs to external CDN?
   - Recommendation: Create a seed script that takes a folder of curated quiz images, extracts dominant colors via sharp, and populates both imageUrls and metadata. Quiz images should be stored in MinIO like other assets.
   - **Resolution:** Plan 01 Task 3 creates seed script with colorTags metadata per option. Images stored in MinIO.

2. **Photo Pose Guide SVG Asset Source** — RESOLVED by Plan 04 Task 2
   - What we know: D-04 requires human body outline overlay for photo guidance; similar to ID photo apps
   - What's unclear: Do we need to create custom SVG or use existing open-source assets?
   - Recommendation: Use a simple SVG body outline (front-view silhouette) as overlay on CameraScreen. Can be hand-drawn SVG or adapted from react-native-body-highlighter assets.
   - **Resolution:** Plan 04 Task 2 creates PhotoGuideOverlay component with inline SVG body outline.

3. **Color Season Sub-type (Light/Deep) Implementation** — RESOLVED by Plan 01 Task 1
   - What we know: D-11 mentions "four types + warm/cool x light/deep sub-dimensions"; ColorSeason enum only has 4 values (spring/summer/autumn/winter)
   - What's unclear: Should we add 8 sub-types to the enum (e.g., warm_spring, light_spring) or keep 4 types with separate warmth/lightness fields?
   - Recommendation: Keep ColorSeason as 4 types; add separate `colorWarmth: String?` and `colorDepth: String?` fields to UserProfile for the sub-dimensions. This preserves backward compatibility and allows more granular analysis without schema breakage.
   - **Resolution:** Plan 01 Task 1 expands ColorSeason enum to 8 subtypes (spring_warm, spring_light, summer_cool, etc.).

4. **Profile Change Event Scope** — RESOLVED by Plan 02 Task 3
   - What we know: D-14 requires notifying AI stylist and recommendation engine on profile changes
   - What's unclear: What specific fields trigger notifications? Should we emit on every field change or only on significant changes?
   - Recommendation: Emit on: bodyType, colorSeason, stylePreferences, colorPreferences changes. Don't emit on height/weight updates alone. Use NestJS EventEmitter2 with typed events.
   - **Resolution:** Plan 02 Task 3 creates ProfileEventEmitter with changedFields parameter, Plan 03 Task 3 integrates subscriptions.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Backend/Mobile build | Yes | v24.14.0 | -- |
| pnpm | Package management | Yes | 8.15.0 | -- |
| Docker | Infrastructure services | Yes | 29.3.1 | -- |
| Docker Compose | Container orchestration | Yes | v5.1.1 | -- |
| Python | ML services | Yes | 3.14.3 | -- |
| PostgreSQL | Database | Not running | -- | Start via docker-compose.dev.yml |
| Redis | Cache + Queue | Not running | -- | Start via docker-compose.dev.yml |
| MinIO | Object storage | Not running | -- | Start via docker-compose.dev.yml |

**Missing dependencies with no fallback:**
- PostgreSQL, Redis, MinIO must be started via `docker-compose -f docker-compose.dev.yml up -d` before development. These are blocking dependencies.

**Missing dependencies with fallback:**
- None identified.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 29.7.x |
| Config file | apps/backend/jest.config.js |
| Quick run command | `cd apps/backend && pnpm test -- --testPathPattern="style-quiz|auth|profile|photos|onboarding" --passWithNoTests` |
| Full suite command | `cd apps/backend && pnpm test:cov` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROF-01 | Photo body analysis + manual input | unit + integration | `pnpm test -- --testPathPattern="photos.service|profile.service"` | Yes |
| PROF-02 | Camera pose guide overlay | unit (snapshot) | Manual verification on device | No (mobile) |
| PROF-03 | Photo quality detection | unit | `pnpm test -- --testPathPattern="photo-quality"` | No -- Wave 0 |
| PROF-04 | Visualization report generation | unit | `pnpm test -- --testPathPattern="poster-generator"` | No -- Wave 0 |
| PROF-05 | Phone + WeChat login | unit + integration | `pnpm test -- --testPathPattern="auth.service"` | Yes |
| PROF-06 | Forced basic info collection | unit | `pnpm test -- --testPathPattern="onboarding.service"` | Yes |
| PROF-07 | Shortest path onboarding flow | e2e (manual) | Manual verification on device | No (mobile) |
| PROF-08 | Image choice quiz | unit | `pnpm test -- --testPathPattern="style-quiz.service"` | Yes |
| PROF-09 | Implicit color derivation | unit | `pnpm test -- --testPathPattern="color-deriver"` | No -- Wave 0 |
| PROF-10 | Color season system | unit | `pnpm test -- --testPathPattern="color-deriver"` | No -- Wave 0 |
| PROF-11 | Behavior-enriched profile | unit | `pnpm test -- --testPathPattern="style-profiles.service"` | No -- Wave 0 |
| PROF-12 | Encrypted photo storage | unit | `pnpm test -- --testPathPattern="photos.service"` | Yes |
| PROF-13 | Profile change event notification | unit | `pnpm test -- --testPathPattern="profile.service"` | Yes |

### Sampling Rate
- **Per task commit:** `cd apps/backend && pnpm test -- --testPathPattern="<module>" --passWithNoTests`
- **Per wave merge:** `cd apps/backend && pnpm test:cov`
- **Phase gate:** Full suite green (94.7% pass rate target, currently 825/871 tests passing)

### Wave 0 Gaps
- [ ] `photo-quality.service.spec.ts` -- covers PROF-03 photo quality detection
- [ ] `poster-generator.service.spec.ts` -- covers PROF-04 poster generation
- [ ] `color-deriver.service.spec.ts` -- covers PROF-09, PROF-10 color derivation + season
- [ ] `style-profiles.service.spec.ts` -- covers PROF-11 behavior enrichment
- [ ] `profile-completeness.service.spec.ts` -- covers profile completeness calculation
- [ ] `quiz-progress-redis.spec.ts` -- covers D-15 Redis-based quiz progress caching

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | JWT + bcrypt + refresh token rotation (existing); WeChat OAuth2 + phone OTP (existing) |
| V3 Session Management | Yes | JWT access tokens (15min) + refresh tokens (7d) with rotation; Redis-backed OTP storage |
| V4 Access Control | Yes | @UseGuards(JwtAuthGuard) on all endpoints; @CurrentUser decorator for user-scoped queries |
| V5 Input Validation | Yes | class-validator DTOs on all endpoints; sharedValidateImageFile for photo uploads |
| V6 Cryptography | Yes | AES-256-GCM for photo storage; bcrypt 12 rounds for passwords; SHA-256 for email hashing; Vault for key management |
| V8 Data Protection | Yes | PII encryption (PrismaEncryptionMiddleware); EXIF stripping on photos; soft delete support |

### Known Threat Patterns for NestJS + React Native + Photo Upload

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| SMS OTP brute force | Tampering | Rate limiting (5 attempts), TTL (5min), Redis throttling (60s) -- already implemented |
| Photo upload XSS/malware | Tampering | MalwareScannerService + EXIF stripping + content-type validation -- already implemented |
| JWT token theft | Spoofing | HttpOnly cookie for web; expo-secure-store for mobile; short access TTL (15min) |
| Profile data leakage | Information Disclosure | PII field encryption; authorized user-only access; soft delete for GDPR/PIPL |
| WeChat OAuth CSRF | Tampering | State parameter in OAuth flow (WeChat API handles this); PKCE for browser-based flow |
| Quiz answer manipulation | Tampering | Server-side validation that questions belong to the quiz; user-scoped answer queries |

## Sources

### Primary (HIGH confidence)
- Codebase inspection: apps/backend/src/modules/{auth,profile,photos,style-quiz,onboarding,style-profiles}/ -- all modules verified present and functional
- apps/backend/prisma/schema.prisma -- all Phase 1 models exist (StyleQuiz, QuizQuestion, QuizAnswer, StyleQuizResult, ShareTemplate, User with wechatOpenId/wechatUnionId)
- apps/backend/package.json -- sharp, canvas, qrcode verified as installed dependencies
- apps/backend/jest.config.js -- 90% coverage threshold confirmed
- apps/mobile/src/screens/onboarding/ -- OnboardingWizard with 4 steps verified

### Secondary (MEDIUM confidence)
- [npm registry] sharp v0.33.2, canvas v3.2.3, qrcode v1.5.4, expo-auth-session v55.0.14, react-native-body-highlighter v3.2.0
- [docs.expo.dev/guides/authentication] -- expo-auth-session OAuth flow documentation
- [github.com/HichamELBSI/react-native-body-highlighter] -- body visualization library

### Tertiary (LOW confidence)
- [GeeksforGeeks Laplacian method] -- blur detection threshold values (needs calibration)
- [Stack Overflow Laplacian blur detection] -- Laplacian variance thresholds are dataset-dependent
- [medium.com/@artemkhrenov] -- Redis key-value store patterns for caching and session management

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all packages verified installed or available in npm registry; codebase already uses them
- Architecture: HIGH -- existing module structure verified through code inspection; patterns match established codebase conventions
- Pitfalls: MEDIUM -- some pitfalls (threshold calibration, font rendering) are based on general knowledge, not project-specific testing

**Research date:** 2026-04-13
**Valid until:** 2026-05-13 (stable -- all dependencies are mature and in-project)
