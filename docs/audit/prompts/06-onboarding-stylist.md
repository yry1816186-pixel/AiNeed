# 轨道 6: 移动端 Onboarding 新流程 + Stylist 单屏体验

你是 XUNO 项目的高级 React Native 工程师。你要实现全新的 4 步 Onboarding 和 Stylist 单屏对话体验。

## 前置依赖

- 轨道 5 已完成导航重构（4Tab 就绪）
- 轨道 2 已完成性别降级（gender 可选）
- 轨道 3/8 已完成对话状态机（API 就绪）

## Part A: 新 Onboarding 4 步流程

### 目标流程

```
Step 1: 选场景（8-12秒）
  8个场景卡片：面试/约会/旅行/通勤/换季/职场/运动/日常
  选中1-2个主要场景

Step 2: 风格偏好（10-15秒）
  6张穿搭图"选2张你喜欢的"（不是9选3，降低认知负荷）
  底部滑动条：偏好倾向（正式 ← → 休闲）

Step 3: 穿着偏好（8-12秒）
  3个简单选项：
  - 下装偏好: 裤装 / 裙装 / 都可以
  - 上衣版型: 修身 / 常规 / 宽松
  - 预算范围: 滑块 200-2000

Step 4: 伊伊搭第一套（价值预览 + 生成）
  先展示一个"基于你的选择，伊伊会这样推荐"的动画预览
  然后生成3套黄金推荐方案
  用户可以选择/跳过
```

### 具体文件

#### OnboardingNavigator

文件: `apps/mobile/src/features/onboarding/navigation/OnboardingNavigator.tsx`

```typescript
// 4步StackNavigator
const OnboardingStack = createStackNavigator();
export const OnboardingNavigator = () => (
  <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
    <OnboardingStack.Screen name="Step1_Scene" component={SceneStep} />
    <OnboardingStack.Screen name="Step2_Style" component={StyleStep} />
    <OnboardingStack.Screen name="Step3_Preference" component={PreferenceStep} />
    <OnboardingStack.Screen name="Step4_Result" component={ResultStep} />
  </OnboardingStack.Navigator>
);
```

#### Step1_Scene 场景选择

文件: `apps/mobile/src/features/onboarding/screens/SceneStep.tsx`

- 8 个场景卡片（2 行 4 列网格布局）
- 每个卡片有图标+场景名称+简短描述
- 支持多选（1-2 个）
- 选中高亮+动画

#### Step2_Style 风格选择

文件: `apps/mobile/src/features/onboarding/screens/StyleStep.tsx`

- 6 张穿搭图片（3 列 2 行），不是 9 张
- 图片覆盖多元风格：简约/优雅/运动/前卫/经典/浪漫
- 多选 2 张
- 底部偏好滑动条

#### Step3_Preference 穿着偏好

文件: `apps/mobile/src/features/onboarding/screens/PreferenceStep.tsx`

- 3 个简洁的选项组
- 下装偏好：3 个横向按钮
- 上衣版型：3 个横向按钮
- 预算范围：滑动条

#### Step4_Result 推荐结果

文件: `apps/mobile/src/features/onboarding/screens/ResultStep.tsx`

- 价值预览动画（1-2 秒）："基于你的选择..."
- 3 套推荐方案轮播（使用黄金推荐数据）
- 每套方案：搭配图+名称+推荐理由+匹配度雷达图
- 底部：喜欢/不喜欢/跳过

### OnboardingStore

文件: `apps/mobile/src/features/onboarding/stores/onboardingStore.ts`

使用 zustand 管理 Onboarding 状态：

```typescript
interface OnboardingState {
  step: number;
  selectedScenes: string[];
  selectedStyles: string[];
  formalityPreference: number; // 0-100
  garmentPreference: {
    lowerBody: "pants" | "skirts" | "both";
    upperFit: "fitted" | "regular" | "loose";
  };
  budgetRange: { min: number; max: number };
  recommendations: any[];

  setScenes: (scenes: string[]) => void;
  setStyles: (styles: string[]) => void;
  // ...
}
```

## Part B: Stylist 单屏体验

### 目标

将 AiStylistScreen + AiStylistChatScreen 合并为一个单屏体验：

- 上半部分：对话消息流
- 下半部分：快速回复按钮 + 输入框
- 右侧：搭配方案面板（滑动展开）

### 具体文件

文件: `apps/mobile/src/features/stylist/screens/StylistScreen.tsx`

```
┌──────────────────────────────────┐
│  [伊伊头像] 造型师伊伊      [×] │
├──────────────────────────────────┤
│                                  │
│  伊伊: 嗨！我是伊伊，你的AI穿搭   │
│        搭子。今天想聊什么场景？   │
│                                  │
│  你: 我后天有面试                │
│                                  │
│  伊伊: 面试加油！什么类型的公司？ │
│        预算大概多少？             │
│                                  │
│  [搭配方案面板 - 可滑动展开]      │
│  ┌──────────────────────┐        │
│  │ 方案A  方案B  方案C   │        │
│  └──────────────────────┘        │
│                                  │
├──────────────────────────────────┤
│  [面试穿搭] [约会穿搭] [换一套]  │ ← 快速回复
├──────────────────────────────────┤
│  [文字输入框]         [发送按钮]  │
└──────────────────────────────────┘
```

### 快速回复按钮

根据对话状态动态生成（从后端 ChatResponseDto.quickReplies 获取）：

- GREET: ["面试穿搭", "约会穿搭", "日常通勤", "旅行穿搭"]
- CONTEXT: ["简约利落", "温柔优雅", "活力运动", "前卫个性"]
- GENERATE: ["喜欢方案 A", "喜欢方案 B", "都不喜欢"]
- REFINE: ["换个颜色", "换个价位", "换个风格"]

### 对话气泡组件

文件: `apps/mobile/src/features/stylist/components/ChatBubble.tsx`

- 伊伊消息：左侧气泡，带伊伊头像
- 用户消息：右侧气泡
- 推荐卡片气泡：内嵌搭配方案缩略图+雷达图
- 语音播放按钮（TTS 输出时显示）

### 语音输出（TTS）

使用 Edge-TTS（免费）：

```typescript
// services/speech/ttsService.ts
import tts from "react-native-tts";

export const speak = async (text: string) => {
  await tts.stop();
  await tts.speak(text, {
    language: "zh-CN",
    pitch: 1.1, // 稍高一点更温柔
    rate: 0.95,
  });
};
```

## 验收标准

1. Onboarding 4 步流程完整可走通
2. Step 4 展示黄金推荐方案（从轨道 10 的 API 获取）
3. Stylist 单屏对话，消息流+快速回复+输入框
4. 快速回复按钮根据对话状态动态变化
5. TTS 能播放伊伊的回复
6. 无 TS 错误
