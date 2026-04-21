# 任务: 移动端关键页面 UI 修复

## 项目路径

C:\AiNeed

## 上下文

移动端有 65 个屏幕，关键页面的 UI/UX 需要验证和修复。这是审计发现的主要 UX 问题。

## 编译命令

```bash
cd /c/AiNeed && node node_modules/typescript/bin/tsc --project apps/mobile/tsconfig.json --noEmit 2>&1 | head -80
```

## 需要验证和修复的页面

### 1. OnboardingScreen — 60 秒 3 步流程

路径: 搜索 `apps/mobile/src/` 下的 onboarding 相关文件

要求:

- Step 1: "认识你" — 性别 3 卡片 + 年龄滑块 + 身高/体重滑块，单击即选
- Step 2: "你的风格" — 3 道内嵌图片选择题，点击自动跳下一题
- Step 3: "上传照片" — 可选，标注"可跳过，随时补传"
- 总时长 < 60 秒
- 无跳转外部页面，全部内嵌

检查:

- 导航结构是否合理
- 组件是否完整存在
- 动画是否流畅

### 2. HomeScreen — Hero Section

路径: `apps/mobile/src/features/home/screens/HomeScreen.tsx`

要求:

- Hero Section: 全宽渐变背景 + 天气感知问候 + AI 风格洞察一句话
- 场景化推荐轮播: 横向 Snap 轮播，每张=穿搭效果图+场景标签+匹配度
- 快捷操作网格: 2x2 圆形渐变图标 + 微动画悬浮

检查:

- WeatherGreeting 组件是否存在
- QuickActions 组件是否存在
- 推荐流组件是否正确渲染

### 3. AiStylistScreen — 合并为单屏

审计发现: 双屏分裂(AiStylistScreen vs AiStylistChatScreen)

要求:

- 合并为单屏对话式体验
- 穿搭卡片内嵌在对话流中
- 用户可以直接在对话中点击推荐商品

检查:

- 两个屏幕是否已合并
- 对话流中是否嵌入了穿搭卡片

### 4. VirtualTryOnScreen — 试穿质量

审计发现: 质量评分是 Math.random()，缺少拍照前引导

要求:

- 3 步引导: 拍照姿势提示 → 照片质量检测 → 生成中
- 真实质量检测替代 Math.random()
- 3 阶段 Loading 动画 (分析中/匹配中/渲染中)

### 5. CheckoutScreen — 2 步结账

审计发现: 3 步+success=4 页面，太多

要求:

- 压缩为 2 步: Step1(地址+配送) → Step2(支付+确认)
- AI 尺码推荐
- 订单成功 Lottie 动效

## 修复策略

1. 先确认每个页面文件存在
2. 检查组件导入是否完整
3. 修复编译错误
4. 补充缺失组件（如果被引用但不存在）

## 验证

每个页面应该:

- 无 TS 编译错误
- 无缺失导入
- 基本渲染结构完整
