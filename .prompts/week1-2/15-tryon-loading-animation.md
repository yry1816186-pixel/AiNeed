# 任务15: 虚拟试穿3阶段Loading动画 + 订单成功动效

## 你的角色

寻裳(AiNeed)项目移动端开发工程师。项目位于 C:\AiNeed，React Native + Reanimated。

## 背景

当前虚拟试穿的Loading状态只有ShimmerSkeleton，无进度提示。订单成功页面只有静态checkmark。需要添加专业级动效。

## 必读文件

1. `apps/mobile/src/features/tryon/screens/` — 所有试穿屏幕
2. `apps/mobile/src/features/tryon/components/` — 试穿组件
3. `apps/mobile/src/features/commerce/screens/CheckoutScreen.tsx` — 订单成功页面
4. `apps/mobile/src/design-system/theme/tokens/design-tokens.ts` — 设计令牌

## 任务

### 1. 创建试穿3阶段Loading组件

创建 `apps/mobile/src/features/tryon/components/TryOnLoadingAnimation.tsx`：

3个阶段动画：

**阶段1 — "分析体型特征..."（2秒）**

- 动画：人体轮廓从透明渐显，扫描线从上到下扫过
- 用Reanimated实现：
  - 轮廓opacity: 0→1 (500ms)
  - 扫描线translateY: 0→身高 (2000ms, withTiming)
  - 关键点（肩/腰/臀）在扫描线经过时闪亮

**阶段2 — "匹配服装..."（3秒）**

- 动画：衣物图标从右侧飞入到人体轮廓上
- 3个衣物（上装/下装/鞋子）依次飞入，每个间隔800ms
- 每个图标用 withSpring 弹性落位

**阶段3 — "生成试穿效果..."（3秒）**

- 动画：渐显合成图
- opacity: 0→1 (withTiming, 3000ms, easeOut)
- 底部进度条从0%到100%

```typescript
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';

interface Props {
  stage: 1 | 2 | 3;
  progress: number; // 0-100
}

export const TryOnLoadingAnimation: React.FC<Props> = ({ stage, progress }) => {
  // ... 实现动画
  return (
    <View style={styles.container}>
      <View style={styles.animationArea}>
        {/* 阶段1: 人体轮廓+扫描线 */}
        {/* 阶段2: 衣物飞入 */}
        {/* 阶段3: 渐显 */}
      </View>
      <Text style={styles.stageText}>
        {stage === 1 && '分析体型特征...'}
        {stage === 2 && '匹配服装...'}
        {stage === 3 && '生成试穿效果...'}
      </Text>
      <View style={styles.progressBar}>
        <Animated.View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.timeEstimate}>
        预计还需 {Math.max(1, Math.ceil((100 - progress) / 20))} 秒
      </Text>
    </View>
  );
};
```

### 2. 集成到试穿流程

找到虚拟试穿发起后等待结果的屏幕，替换现有的ShimmerSkeleton为TryOnLoadingAnimation。

模拟3阶段进度：

```typescript
const [stage, setStage] = useState<1 | 2 | 3>(1);
const [progress, setProgress] = useState(0);

// 阶段1: 0-2秒, 进度0-30%
// 阶段2: 2-5秒, 进度30-70%
// 阶段3: 5-8秒, 进度70-100%

useEffect(() => {
  const timer1 = setTimeout(() => setStage(2), 2000);
  const timer2 = setTimeout(() => setStage(3), 5000);

  const interval = setInterval(() => {
    setProgress((prev) => {
      if (prev >= 100) {
        clearInterval(interval);
        return 100;
      }
      return prev + 2;
    });
  }, 160); // 8秒内从0到100

  return () => {
    clearTimeout(timer1);
    clearTimeout(timer2);
    clearInterval(interval);
  };
}, []);
```

### 3. 订单成功动效

创建 `apps/mobile/src/features/commerce/components/OrderSuccessAnimation.tsx`：

```typescript
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming } from 'react-native-reanimated';

export const OrderSuccessAnimation: React.FC = () => {
  const scale = useSharedValue(0);
  const checkOpacity = useSharedValue(0);

  useEffect(() => {
    // 购物袋弹入
    scale.value = withSpring(1, { damping: 8, stiffness: 100 });
    // 对勾延迟渐显
    checkOpacity.value = withDelay(400, withTiming(1, { duration: 300 }));
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.bagContainer, { transform: [{ scale }] }]}>
        {/* 购物袋图标 */}
        <View style={styles.bag}>
          <Text style={styles.bagIcon}>🛍️</Text>
        </View>
        {/* 对勾覆盖 */}
        <Animated.View style={[styles.checkmark, { opacity: checkOpacity }]}>
          <Text style={styles.checkText}>✓</Text>
        </Animated.View>
      </Animated.View>

      <Text style={styles.successTitle}>下单成功！</Text>
      <Text style={styles.successSubtitle}>你的时尚单品正在飞奔而来</Text>

      {/* 推荐区 */}
      <View style={styles.recommendSection}>
        <Text style={styles.recommendTitle}>买了这件的人还搭配了...</Text>
        {/* TODO: 横向推荐卡片 */}
      </View>
    </View>
  );
};
```

### 4. 集成到CheckoutScreen

找到CheckoutScreen中订单成功的页面/状态，将静态checkmark替换为OrderSuccessAnimation组件。

## 验证标准

- [ ] TryOnLoadingAnimation.tsx 创建，包含3阶段动画
- [ ] 每个阶段有对应的文字描述和进度条
- [ ] OrderSuccessAnimation.tsx 创建
- [ ] 试穿等待页面使用新的3阶段Loading
- [ ] 订单成功页面使用新的动效组件
- [ ] 使用设计令牌中的品牌色(#FF6B6B)和渐变
- [ ] TypeScript编译无错误
