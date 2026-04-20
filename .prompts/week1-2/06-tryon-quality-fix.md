# 任务06: 修复虚拟试穿质量评分(伪随机数→真实检测) + HomeScreen缺失组件

## 你的角色

你是寻裳(AiNeed)项目的全栈工程师。项目位于 C:\AiNeed。

## 背景

审计发现两个P0问题：

1. 虚拟试穿CameraScreen的质量评分使用 `Math.random()`，不是真实检测
2. HomeScreen引用了 WeatherGreeting/QuickActions/ProfileCompletionBanner 但组件文件缺失或路径错误

## 任务A: 修复图像质量检测

### 1. 定位伪随机数代码

读取 `apps/mobile/src/features/tryon/screens/CameraScreen.tsx`（或类似文件），找到：

```typescript
Math.round(70 + Math.random() * 15);
```

### 2. 实现真实质量检测

替换为基于实际图像分析的检测函数：

```typescript
// 创建新文件: apps/mobile/src/features/tryon/utils/image-quality.ts

/**
 * 基于Canvas的图像质量检测（无模型依赖，纯像素分析）
 */
export interface QualityResult {
  score: number; // 0-100
  sharpness: number; // 锐度
  brightness: number; // 亮度 0-255
  contrast: number; // 对比度
  issues: string[]; // 问题列表
}

export async function analyzeImageQuality(imageUri: string): Promise<QualityResult> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      // 缩放到小尺寸加速计算
      const maxSize = 640;
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // 1. 锐度检测 (Laplacian方差)
      const sharpness = computeSharpness(data, canvas.width, canvas.height);

      // 2. 亮度 (V通道均值)
      const brightness = computeBrightness(data);

      // 3. 对比度 (标准差)
      const contrast = computeContrast(data);

      // 综合评分
      const issues: string[] = [];
      let score = 100;

      if (sharpness < 50) {
        score -= 25;
        issues.push("图像模糊");
      }
      if (brightness < 80) {
        score -= 20;
        issues.push("光线不足");
      }
      if (brightness > 220) {
        score -= 15;
        issues.push("光线过亮");
      }
      if (contrast < 40) {
        score -= 15;
        issues.push("对比度低");
      }

      resolve({
        score: Math.max(0, Math.min(100, score)),
        sharpness,
        brightness,
        contrast,
        issues,
      });
    };
    img.src = imageUri;
  });
}

function computeSharpness(data: Uint8ClampedArray, width: number, height: number): number {
  // Laplacian 3x3卷积核的方差
  let sum = 0;
  let sumSq = 0;
  let count = 0;

  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const idx = (y * width + x) * 4;
      const center = data[idx]; // R通道

      const top = data[((y - 1) * width + x) * 4];
      const bottom = data[((y + 1) * width + x) * 4];
      const left = data[(y * width + (x - 1)) * 4];
      const right = data[(y * width + (x + 1)) * 4];

      const laplacian = Math.abs(-4 * center + top + bottom + left + right);
      sum += laplacian;
      sumSq += laplacian * laplacian;
      count++;
    }
  }

  const mean = sum / count;
  const variance = sumSq / count - mean * mean;
  return Math.min(100, Math.sqrt(variance));
}

function computeBrightness(data: Uint8ClampedArray): number {
  let sum = 0;
  const pixelCount = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    // 简化亮度公式: 0.299R + 0.587G + 0.114B
    sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return sum / pixelCount;
}

function computeContrast(data: Uint8ClampedArray): number {
  let sum = 0;
  let sumSq = 0;
  const pixelCount = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    sum += luma;
    sumSq += luma * luma;
  }
  const mean = sum / pixelCount;
  return Math.sqrt(sumSq / pixelCount - mean * mean);
}
```

注意：上面是通用JS实现。如果项目使用React Native，需要用 `react-native-image-size` 或 `expo-image-manipulator` 来获取像素数据。根据项目的实际依赖选择实现方式。

### 3. 替换CameraScreen中的伪随机数

在CameraScreen中找到质量评分的位置，将 `Math.round(70 + Math.random() * 15)` 替换为调用 `analyzeImageQuality()`。

## 任务B: 修复HomeScreen缺失组件

### 1. 定位缺失组件

读取 `apps/mobile/src/features/home/screens/HomeScreen.tsx`，找到所有import但文件不存在的组件。

用ls检查这些组件的实际位置：

```bash
find apps/mobile/src -name "WeatherGreeting*" -o -name "QuickActions*" -o -name "ProfileCompletionBanner*"
```

### 2. 修复方案

**情况A**：组件存在但路径错误 → 修正import路径

**情况B**：组件确实不存在 → 创建简化版组件

WeatherGreeting 简化版：

```typescript
// apps/mobile/src/features/home/components/WeatherGreeting.tsx
import React from 'react';
import { View, Text } from 'react-native';

interface Props {
  userName?: string;
}

export const WeatherGreeting: React.FC<Props> = ({ userName }) => (
  <View style={{ padding: 16 }}>
    <Text style={{ fontSize: 24, fontWeight: '700' }}>
      Hi, {userName || '时尚达人'}
    </Text>
    <Text style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
      今天想穿什么风格？
    </Text>
  </View>
);
```

QuickActions 简化版：

```typescript
// apps/mobile/src/features/home/components/QuickActions.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface Props {
  onAction: (action: string) => void;
}

const actions = [
  { id: 'stylist', label: 'AI造型师', icon: '🎨' },
  { id: 'tryon', label: '虚拟试穿', icon: '👗' },
  { id: 'wardrobe', label: '我的衣橱', icon: '👔' },
  { id: 'report', label: '风格报告', icon: '📊' },
];

export const QuickActions: React.FC<Props> = ({ onAction }) => (
  <View style={{ flexDirection: 'row', justifyContent: 'space-around', padding: 16 }}>
    {actions.map(action => (
      <TouchableOpacity key={action.id} onPress={() => onAction(action.id)} style={{ alignItems: 'center' }}>
        <Text style={{ fontSize: 32 }}>{action.icon}</Text>
        <Text style={{ fontSize: 12, marginTop: 4 }}>{action.label}</Text>
      </TouchableOpacity>
    ))}
  </View>
);
```

ProfileCompletionBanner 简化版（如果不存在）：

```typescript
// apps/mobile/src/features/home/components/ProfileCompletionBanner.tsx
import React from 'react';
import { View, Text, TouchableOpacity, ProgressBar } from 'react-native';

interface Props {
  completionPercent: number;
  onCompleteProfile: () => void;
}

export const ProfileCompletionBanner: React.FC<Props> = ({ completionPercent, onCompleteProfile }) => {
  if (completionPercent >= 100) return null;

  return (
    <TouchableOpacity onPress={onCompleteProfile} style={{ padding: 16, backgroundColor: '#FFF3E0', borderRadius: 12, margin: 16 }}>
      <Text style={{ fontWeight: '600' }}>完善你的风格画像</Text>
      <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
        完成度 {completionPercent}% — 越完整推荐越精准
      </Text>
      <View style={{ height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, marginTop: 8 }}>
        <View style={{ height: 4, width: `${completionPercent}%`, backgroundColor: '#FF6B6B', borderRadius: 2 }} />
      </View>
    </TouchableOpacity>
  );
};
```

### 3. 确保HomeScreen正常渲染

修复所有import路径，确保HomeScreen能正常渲染无报错。

## 验证标准

- [ ] CameraScreen中无 `Math.random()` 质量评分
- [ ] image-quality.ts 创建并实现锐度/亮度/对比度检测
- [ ] HomeScreen所有import的组件都存在
- [ ] WeatherGreeting/QuickActions/ProfileCompletionBanner 组件可用
- [ ] HomeScreen能正常渲染无红色错误
