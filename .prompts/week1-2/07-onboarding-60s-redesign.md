# 任务07: Onboarding 60秒内嵌方案重写

## 你的角色

寻裳(AiNeed)项目移动端开发工程师。项目位于 C:\AiNeed，React Native + TypeScript。

## 背景

当前OnboardingScreen有3步但Quiz步骤只是跳转到外部页面，流程超过60秒。需要重写为全部内嵌的流畅体验。

## 必读文件

1. `apps/mobile/src/features/onboarding/screens/OnboardingScreen.tsx` — 当前实现
2. `apps/mobile/src/features/onboarding/` — 目录下所有文件
3. `apps/mobile/src/features/profile/screens/StyleQuizScreen.tsx` — 当前Quiz页面（如果存在）
4. `apps/mobile/src/stores/` — Zustand stores
5. `apps/mobile/src/services/` — API服务

## 任务

### 1. 重写 OnboardingScreen 为3步内嵌方案

**Step 1 — "认识你"（20秒）**

- 性别选择：3个竖排大卡片（女/男/其他），带图标，单击选中带选中态动画
- 年龄段：横向滑动选择器（18-24 / 25-30 / 31-35 / 36-40 / 40+）
- 身高：滑块 150-185cm，显示当前值
- 体重：滑块 40-100kg，显示当前值
- 所有选项单击即选中，无需点"下一步"

**Step 2 — "你的风格"（25秒）**

- 3道内嵌图片选择题，每题2x2网格
- Q1: "你更喜欢哪种风格？" — 甜美/知性/街头/极简（每项配图片URL，可用placeholder）
- Q2: "日常穿搭场景？" — 通勤/约会/休闲/运动
- Q3: "色彩偏好？" — 暖色系/冷色系/中性色/都喜欢
- 每题点击后自动0.5秒延迟跳下一题（auto-advance）

**Step 3 — "上传照片"（15秒）**

- 顶部标注"可跳过，随时补传"文字+跳过按钮
- 半身人形轮廓参考线（用SVG或图片占位）
- 一键拍照/从相册选择按钮
- "AI会如何使用你的照片"透明说明文字

### 2. 实现细节

- 进度条：底部品牌色条随步骤推进填充，用 Reanimated withSpring
- 每步 FadeInUp 入场动画
- 完成后显示"你的风格画像预览"卡片（简要展示结果）
- 完成动画：checkmark bounce 或简单confetti

### 3. 数据提交

完成3步后，将数据一次性提交到后端API：

```typescript
interface OnboardingData {
  gender: string;
  ageRange: string;
  height: number;
  weight: number;
  preferredStyle: string;
  mainOccasion: string;
  colorPreference: string;
  photoUri?: string; // 可选
}
```

调用 `PUT /api/v1/profile` 或对应的API更新用户画像。

### 4. 删除外部Quiz跳转

移除OnboardingScreen中跳转到StyleQuizScreen的逻辑，改为内嵌。

## 验证标准

- [ ] OnboardingScreen包含3个内嵌步骤，无外部跳转
- [ ] Step 1有性别+年龄+身高+体重
- [ ] Step 2有3道内嵌图片选择题
- [ ] Step 3有可选照片上传
- [ ] 进度条动画正常
- [ ] 数据提交到后端API
- [ ] TypeScript编译无错误
