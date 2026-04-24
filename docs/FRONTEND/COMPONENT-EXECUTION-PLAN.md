# XUNO 组件执行计划

> 25 个组件详细实现方案 | 含代码骨架
> 基于 VISUAL-STANDARDS.md + VISUAL-REFERENCE-DATABASE.md
> 执行窗口的唯一输入 | 2026-04

---

## 执行优先级

```
P0 (首页第一印象) → Page 1: TodayScreen 组件 (1-6)
P1 (核心交互)    → Page 3: StylistScreen 组件 (12-17)
P2 (发现浏览)    → Page 2: DiscoverScreen 组件 (7-11)
P3 (个人中心)    → Page 4: ProfileScreen 组件 (18-20)
P4 (跨页面)      → Global 组件 (21-25)
```

---

## Page 1: TodayScreen（首页，第一印象）

### 组件 1: GlassHeader — 毛玻璃效果顶栏

**视觉参考：** 项目已有 LiquidGlassCard (FluidAnimations.tsx:51-128)
**文件位置：** `src/features/today/components/GlassHeader.tsx`
**依赖：** expo-blur, react-native-reanimated, react-native-linear-gradient

```typescript
import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "react-native-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
  Easing,
} from "react-native-reanimated";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";

interface GlassHeaderProps {
  title: string;
  subtitle?: string;
  scrollProgress?: Animated.SharedValue<number>;
}

export const GlassHeader: React.FC<GlassHeaderProps> = ({ title, subtitle, scrollProgress }) => {
  const breathScale = useSharedValue(1);

  React.useEffect(() => {
    breathScale.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: scrollProgress ? interpolate(scrollProgress.value, [0, 100], [1, 0.8], "clamp") : 1,
    transform: [{ scale: breathScale.value }],
  }));

  return (
    <Animated.View style={[styles.container, headerAnimatedStyle]}>
      <LinearGradient
        colors={[DesignTokens.gradients.brand[0], DesignTokens.gradients.brand[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <BlurView intensity={Platform.OS === "ios" ? 60 : 40} tint="light" style={styles.blur}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </BlurView>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { overflow: "hidden", borderRadius: DesignTokens.borderRadius["3xl"] },
  gradient: {
    /* brand gradient background */
  },
  blur: { padding: DesignTokens.spacing[5] },
  title: {
    fontSize: DesignTokens.typography.sizes["2xl"],
    fontWeight: DesignTokens.typography.fontWeights.bold as any,
    color: DesignTokens.colors.text.inverse,
    letterSpacing: DesignTokens.typography.letterSpacing.tight,
  },
  subtitle: {
    fontSize: DesignTokens.typography.sizes.base,
    color: "rgba(255,255,255,0.8)",
    marginTop: DesignTokens.spacing[1],
  },
});
```

---

### 组件 2: WeatherSceneCard — 天气+场景感知卡片

**文件位置：** `src/features/today/components/WeatherSceneCard.tsx`
**依赖：** react-native-reanimated, react-native-linear-gradient, phosphor-react-native

```typescript
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "react-native-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Sun } from "phosphor-react-native";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { SpringConfigs } from "../../../design-system/theme/tokens/animations";

interface WeatherSceneCardProps {
  weather: { temp: number; condition: string; icon: string };
  scene: { title: string; description: string };
  onPress?: () => void;
}

export const WeatherSceneCard: React.FC<WeatherSceneCardProps> = ({ weather, scene, onPress }) => {
  const breathScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0);

  React.useEffect(() => {
    // 呼吸脉动 - slow spring
    breathScale.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    // 边缘发光呼吸
    glowOpacity.value = withRepeat(
      withSequence(withTiming(0.6, { duration: 2000 }), withTiming(0.2, { duration: 2000 })),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: breathScale.value }],
    shadowOpacity: interpolate(glowOpacity.value, [0.2, 0.6], [0.1, 0.25]),
  }));

  return (
    <Animated.View style={[styles.card, animatedStyle]}>
      <LinearGradient
        colors={["#C67B5C", "#D9A441"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.weatherRow}>
          <Sun size={24} color="#FFF" weight="fill" />
          <Text style={styles.weatherText}>
            {weather.temp}°C {weather.condition}
          </Text>
        </View>
        <Text style={styles.sceneTitle}>{scene.title}</Text>
        <Text style={styles.sceneDesc}>{scene.description}</Text>
      </LinearGradient>
    </Animated.View>
  );
};
```

---

### 组件 3: OutfitCarousel — 推荐方案 3D 轮播

**文件位置：** `src/features/today/components/OutfitCarousel.tsx`
**依赖：** react-native-reanimated-carousel, react-native-reanimated, react-native-fast-image

```typescript
import React from "react";
import { View, Text, StyleSheet, Dimensions, Pressable } from "react-native";
import Carousel from "react-native-reanimated-carousel";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { SpringConfigs } from "../../../design-system/theme/tokens/animations";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH * 0.7;
const CARD_HEIGHT = 320;

interface OutfitItem {
  id: string;
  image: string;
  title: string;
  matchScore: number;
  tags: string[];
}

interface OutfitCarouselProps {
  items: OutfitItem[];
  onSelect?: (id: string) => void;
}

// 3D透视旋转自定义动画
const customAnimation = (value: number) => {
  "worklet";
  const rotateY = interpolate(value, [-1, 0, 1], [-25, 0, 25], Extrapolate.CLAMP);
  const translateX = interpolate(value, [-1, 0, 1], [-SCREEN_WIDTH * 0.6, 0, SCREEN_WIDTH * 0.6]);
  const scale = interpolate(value, [-1, 0, 1], [0.75, 1, 0.75]);
  const opacity = interpolate(value, [-1, -0.5, 0, 0.5, 1], [0.4, 0.7, 1, 0.7, 0.4]);
  return {
    transform: [{ perspective: 400 }, { rotateY: `${rotateY}deg` }, { translateX }, { scale }],
    opacity,
  };
};

export const OutfitCarousel: React.FC<OutfitCarouselProps> = ({ items, onSelect }) => {
  const progressValue = useSharedValue(0);

  return (
    <Carousel
      width={CARD_WIDTH}
      height={CARD_HEIGHT}
      data={items}
      defaultIndex={0}
      onProgressChange={(_, progress) => {
        progressValue.value = progress;
      }}
      customAnimation={customAnimation}
      scrollAnimationDuration={800}
      panGestureHandlerProps={{ activeOffsetX: [-10, 10] }}
      renderItem={({ item, index }) => (
        <OutfitCarouselCard
          item={item}
          index={index}
          progress={progressValue}
          onSelect={onSelect}
        />
      )}
    />
  );
};

// 单个轮播卡片 - 匹配度badge + 标签 + 弹性按压
const OutfitCarouselCard: React.FC<{
  item: OutfitItem;
  index: number;
  progress: Animated.SharedValue<number>;
  onSelect?: (id: string) => void;
}> = ({ item, index, progress, onSelect }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, SpringConfigs.snappy);
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, SpringConfigs.bouncy);
  };

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={() => onSelect?.(item.id)}
    >
      <Animated.View style={[styles.card, animatedStyle]}>
        {/* 图片 + 匹配度Badge + 标签 */}
        <View style={styles.imageContainer}>
          <View style={styles.imagePlaceholder} />
          {/* 匹配度Badge - 数字从0动画到目标值 */}
          <MatchScoreBadge score={item.matchScore} />
          {/* 标签 */}
          <View style={styles.tagRow}>
            {item.tags.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
        <Text style={styles.cardTitle}>{item.title}</Text>
      </Animated.View>
    </Pressable>
  );
};

// 匹配度Badge - 数字滚动动画
const MatchScoreBadge: React.FC<{ score: number }> = ({ score }) => {
  const animatedScore = useSharedValue(0);

  React.useEffect(() => {
    animatedScore.value = withSpring(score, SpringConfigs.gentle);
  }, [score]);

  const animatedStyle = useAnimatedStyle(() => ({
    // 数字显示用reanimated的toString在Text中
  }));

  return (
    <Animated.View style={[styles.scoreBadge]}>
      <Animated.Text style={styles.scoreText}>{Math.round(animatedScore.value)}%</Animated.Text>
      <Text style={styles.scoreLabel}>匹配</Text>
    </Animated.View>
  );
};
```

---

### 组件 4: OutfitCard — 单个搭配卡片（重写）

**文件位置：** `src/design-system/ui/OutfitCard.tsx`（重写）
**改进：** 从 3/10 提升到 9/10

```typescript
import React from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import { LinearGradient } from "react-native-linear-gradient";
import { Heart } from "phosphor-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
} from "react-native-reanimated";
import { DesignTokens } from "../../theme/tokens/design-tokens";
import { SpringConfigs } from "../theme/tokens/animations";

interface OutfitCardProps {
  id: string;
  image: string;
  title: string;
  subtitle?: string;
  tag?: string;
  matchScore?: number;
  price?: number;
  onPress: (id: string) => void;
  onFavorite?: (id: string) => void;
  isFavorite?: boolean;
  index?: number; // 用于交错动画
}

export const OutfitCard: React.FC<OutfitCardProps> = ({
  id,
  image,
  title,
  subtitle,
  tag,
  matchScore,
  price,
  onPress,
  onFavorite,
  isFavorite = false,
  index = 0,
}) => {
  const scale = useSharedValue(1);
  const heartScale = useSharedValue(1);
  const shadowElevation = useSharedValue(2);

  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    elevation: shadowElevation.value,
    shadowOpacity: interpolate(shadowElevation.value, [2, 8], [0.06, 0.15]),
  }));

  const heartAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, SpringConfigs.snappy);
    shadowElevation.value = withSpring(8, SpringConfigs.snappy);
  };
  const handlePressOut = () => {
    scale.value = withSpring(1, SpringConfigs.bouncy);
    shadowElevation.value = withSpring(2, SpringConfigs.snappy);
  };
  const handleFavorite = () => {
    heartScale.value = withSequence(
      withSpring(1.4, SpringConfigs.bouncy),
      withSpring(1, SpringConfigs.bouncy)
    );
    onFavorite?.(id);
  };

  // 进入动画：交错延迟
  const entering = FadeInUp.delay(index * 50)
    .springify()
    .damping(12)
    .stiffness(180);

  return (
    <Animated.View entering={entering} style={cardAnimatedStyle}>
      <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={() => onPress(id)}>
        <View style={styles.card}>
          <View style={styles.imageContainer}>
            <Image source={{ uri: image }} style={styles.image} />
            {/* 匹配度Badge */}
            {matchScore !== undefined && <MatchScoreBadge score={matchScore} />}
            {/* 标签 */}
            {tag && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            )}
            {/* 收藏按钮 */}
            {onFavorite && (
              <Pressable style={styles.favoriteButton} onPress={handleFavorite}>
                <Animated.View style={heartAnimatedStyle}>
                  <Heart
                    size={20}
                    weight={isFavorite ? "fill" : "regular"}
                    color={isFavorite ? DesignTokens.colors.brand.terracotta : "#FFF"}
                  />
                </Animated.View>
              </Pressable>
            )}
          </View>
          <View style={styles.info}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
            {price !== undefined && <Text style={styles.price}>¥{price.toFixed(2)}</Text>}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
};
```

---

### 组件 5: AiInsightBubble — 伊伊推荐语气泡

**文件位置：** `src/features/today/components/AiInsightBubble.tsx`
**依赖：** react-native-reanimated, phosphor-react-native

```typescript
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Sparkle } from "phosphor-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
} from "react-native-reanimated";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";

interface AiInsightBubbleProps {
  message: string;
  typewriterSpeed?: number;
}

export const AiInsightBubble: React.FC<AiInsightBubbleProps> = ({
  message,
  typewriterSpeed = 30,
}) => {
  const [displayedText, setDisplayedText] = useState("");
  const sparkleRotation = useSharedValue(0);

  // 打字机效果
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i <= message.length) {
        setDisplayedText(message.slice(0, i));
        i++;
      } else {
        clearInterval(interval);
      }
    }, typewriterSpeed);
    return () => clearInterval(interval);
  }, [message, typewriterSpeed]);

  // Sparkle图标旋转
  useEffect(() => {
    sparkleRotation.value = withRepeat(
      withSequence(
        withTiming(15, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(-15, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const sparkleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sparkleRotation.value}deg` }],
  }));

  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        <Animated.View style={[styles.iconWrap, sparkleStyle]}>
          <Sparkle size={16} color={DesignTokens.colors.brand.terracotta} weight="fill" />
        </Animated.View>
        <Text style={styles.label}>伊伊有话说</Text>
      </View>
      <Text style={styles.message}>
        {displayedText}
        <Text style={styles.cursor}>|</Text>
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingVertical: DesignTokens.spacing[4] },
  bubble: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  iconWrap: { width: 24, height: 24 },
  label: { fontSize: 13, fontWeight: "600", color: DesignTokens.colors.brand.terracotta },
  message: {
    fontSize: DesignTokens.typography.sizes.base,
    color: DesignTokens.colors.text.secondary,
    lineHeight: 22,
    fontStyle: "italic",
  },
  cursor: { color: DesignTokens.colors.brand.terracotta, fontWeight: "300" },
});
```

---

### 组件 6: QuickReplyButtons — 快速回复按钮组

**文件位置：** `src/features/today/components/QuickReplyButtons.tsx`

```typescript
import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { SpringConfigs } from "../../../design-system/theme/tokens/animations";

interface QuickReplyButtonsProps {
  options: string[];
  onSelect: (option: string) => void;
}

const QuickReplyButton: React.FC<{ label: string; onPress: () => void }> = ({ label, onPress }) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPressIn={() => {
        scale.value = withSpring(0.94, SpringConfigs.snappy);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, SpringConfigs.bouncy);
      }}
      onPress={onPress}
    >
      <Animated.View style={[styles.button, animatedStyle]}>
        <Text style={styles.buttonText}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
};

export const QuickReplyButtons: React.FC<QuickReplyButtonsProps> = ({ options, onSelect }) => (
  <View style={styles.container}>
    {options.map((option, i) => (
      <Animated.View key={option} entering={FadeInRight.delay(i * 80).springify()}>
        <QuickReplyButton label={option} onPress={() => onSelect(option)} />
      </Animated.View>
    ))}
  </View>
);
```

---

## Page 2: DiscoverScreen（发现页）

### 组件 7: SearchBar — 搜索栏

**文件位置：** `src/features/discover/components/SearchBar.tsx`

```typescript
import React from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { MagnifyingGlass, X } from "phosphor-react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ value, onChangeText, onFocus, onBlur }) => {
  const isFocused = useSharedValue(0);
  const width = useSharedValue(0.9); // 展开比例

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: 0.9 + isFocused.value * 0.1 }],
    shadowOpacity: interpolate(isFocused.value, [0, 1], [0, 0.1]),
    elevation: interpolate(isFocused.value, [0, 1], [0, 4]),
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <BlurView intensity={40} tint="light" style={styles.blur}>
        <MagnifyingGlass size={20} color={DesignTokens.colors.neutral[400]} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => {
            isFocused.value = withSpring(1);
            onFocus?.();
          }}
          onBlur={() => {
            isFocused.value = withSpring(0);
            onBlur?.();
          }}
          placeholder="搜索穿搭、场景、单品..."
          placeholderTextColor={DesignTokens.colors.neutral[400]}
        />
        {value.length > 0 && (
          <Pressable onPress={() => onChangeText("")}>
            <X size={18} color={DesignTokens.colors.neutral[400]} />
          </Pressable>
        )}
      </BlurView>
    </Animated.View>
  );
};
```

---

### 组件 8: ScenePills — 场景选择胶囊

**文件位置：** `src/features/discover/components/ScenePills.tsx`

```typescript
// 核心动效：选中时弹性缩放 + 背景色渐变切换
// 使用 withSequence(withSpring(1.1, bouncy), withSpring(1)) 实现弹性选中
// 未选中态：neutral.200 背景 + neutral.600 文字
// 选中态：terracotta 渐变背景 + white 文字
```

---

### 组件 9: ProductFeedCard — 商品推荐卡片

**文件位置：** `src/features/discover/components/ProductFeedCard.tsx`

```typescript
// 瀑布流布局中的单个商品卡片
// 核心动效：
// 1. 进入：交错延迟 FadeInUp + Scale (0.9→1) bouncy
// 2. 按压：scale 0.97 + shadow增大
// 3. 图片：使用 react-native-fast-image 缓存加载
// 4. 收藏：心形弹性 + 颜色变化（同OutfitCard）
```

---

### 组件 10: MatchScoreBadge — 匹配度小徽章

**文件位置：** `src/design-system/ui/MatchScoreBadge.tsx`

```typescript
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { DesignTokens } from "../../theme/tokens/design-tokens";
import { SpringConfigs } from "../theme/tokens/animations";

interface MatchScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
  animated?: boolean;
}

export const MatchScoreBadge: React.FC<MatchScoreBadgeProps> = ({
  score,
  size = "md",
  animated = true,
}) => {
  const animatedScore = useSharedValue(0);
  const scale = useSharedValue(0);

  React.useEffect(() => {
    if (animated) {
      animatedScore.value = withTiming(score, { duration: 800 });
      scale.value = withSpring(1, SpringConfigs.bouncy);
    } else {
      animatedScore.value = score;
      scale.value = 1;
    }
  }, [score, animated]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // 颜色根据分数
  const getColor = (s: number) => {
    if (s >= 80) return DesignTokens.colors.semantic.success;
    if (s >= 60) return DesignTokens.gradients.warm[0]; // terracotta
    return DesignTokens.colors.semantic.warning;
  };

  const sizeConfig = {
    sm: { width: 36, height: 36, fontSize: 10 },
    md: { width: 44, height: 44, fontSize: 12 },
    lg: { width: 56, height: 56, fontSize: 16 },
  };

  const config = sizeConfig[size];

  return (
    <Animated.View
      style={[styles.badge, { ...config, backgroundColor: getColor(score) }, animatedStyle]}
    >
      <Animated.Text style={[styles.score, { fontSize: config.fontSize }]}>
        {Math.round(animatedScore.value)}
      </Animated.Text>
      <Text style={styles.label}>%</Text>
    </Animated.View>
  );
};
```

---

### 组件 11: RecommendReasonTag — 推荐理由标签

**文件位置：** `src/design-system/ui/RecommendReasonTag.tsx`

```typescript
// 渐变背景标签：brand渐变 / sage渐变
// 核心动效：出现时 PopIn (scale 0.8→1.05→1 rubber)
// 样式：圆角胶囊、小字号(xs)、轻字重
```

---

## Page 3: StylistScreen（造型师对话页）

### 组件 12: ChatBubble — 消息气泡（重写）

**文件位置：** `src/design-system/ui/ChatBubble.tsx`（重写）

```typescript
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "react-native-linear-gradient";
import Animated, {
  FadeInLeft,
  FadeInRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { DesignTokens } from "../../theme/tokens/design-tokens";
import { SpringConfigs } from "../theme/tokens/animations";

interface ChatBubbleProps {
  message: string;
  isUser: boolean;
  timestamp?: string;
  showAvatar?: boolean;
  children?: React.ReactNode; // 嵌入OutfitResultBubble等
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  isUser,
  timestamp,
  showAvatar = true,
  children,
}) => {
  const scale = useSharedValue(0.95);

  React.useEffect(() => {
    scale.value = withSpring(1, SpringConfigs.bouncy);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // 用户消息从右弹性出现，AI消息从左弹性出现
  const entering = isUser
    ? FadeInRight.springify().damping(12).stiffness(180)
    : FadeInLeft.springify().damping(12).stiffness(180);

  return (
    <Animated.View entering={entering} style={[styles.container, !isUser && styles.aiContainer]}>
      {/* AI头像 */}
      {!isUser && showAvatar && <View style={styles.avatar}>...</View>}

      <Animated.View
        style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble, animatedStyle]}
      >
        {isUser ? (
          <LinearGradient colors={DesignTokens.gradients.brand} style={styles.userGradient}>
            <Text style={styles.userMessage}>{message}</Text>
          </LinearGradient>
        ) : (
          <View style={styles.aiContent}>
            <Text style={styles.aiMessage}>{message}</Text>
            {children}
          </View>
        )}
        {timestamp && <Text style={styles.timestamp}>{timestamp}</Text>}
      </Animated.View>
    </Animated.View>
  );
};
```

---

### 组件 13: OutfitResultBubble — 搭配方案气泡

**文件位置：** `src/features/stylist/components/OutfitResultBubble.tsx`

```typescript
// 聊天中嵌入的搭配推荐结果
// 核心组成：ChatBubble包裹 + 内嵌OutfitCard(小尺寸) + MatchRadarChart(小尺寸)
// 动效：整体弹性出现 + 卡片交错延迟出现 + 雷达图从0展开
```

---

### 组件 14: TypingIndicator — 打字指示器

**文件位置：** `src/features/stylist/components/TypingIndicator.tsx`

```typescript
import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withDelay,
  withTiming,
} from "react-native-reanimated";

const DOT_COUNT = 3;
const BOUNCE_HEIGHT = -8;
const BOUNCE_DURATION = 300;
const STAGGER_DELAY = 150;

export const TypingIndicator: React.FC = () => {
  return (
    <View style={styles.container}>
      {Array.from({ length: DOT_COUNT }).map((_, i) => (
        <TypingDot key={i} index={i} />
      ))}
    </View>
  );
};

const TypingDot: React.FC<{ index: number }> = ({ index }) => {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      index * STAGGER_DELAY,
      withRepeat(
        withSequence(
          withTiming(BOUNCE_HEIGHT, { duration: BOUNCE_DURATION }),
          withTiming(0, { duration: BOUNCE_DURATION })
        ),
        -1,
        false
      )
    );
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[styles.dot, animatedStyle]} />;
};

const styles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", gap: 4, padding: 12 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: DesignTokens.colors.brand.terracotta,
  },
});
```

---

### 组件 15: QuickReplyBar — 底部快速回复栏

**文件位置：** `src/features/stylist/components/QuickReplyBar.tsx`

```typescript
// 底部固定的快速回复选项栏
// 核心动效：从底部弹性滑入 (translateY 100→0 bouncy)
// 每个按钮：按压弹性缩放 + 选中态渐变背景
// 类似组件6但横向排列在底部
```

---

### 组件 16: VoiceButton — 语音按钮

**文件位置：** `src/features/stylist/components/VoiceButton.tsx`

```typescript
import React, { useEffect } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Microphone } from "phosphor-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";

interface VoiceButtonProps {
  isListening: boolean;
  onPress: () => void;
}

export const VoiceButton: React.FC<VoiceButtonProps> = ({ isListening, onPress }) => {
  const pulseScale = useSharedValue(1);
  const ringScale = useSharedValue(1);
  const ringOpacity = useSharedValue(0);

  useEffect(() => {
    if (isListening) {
      // 脉冲动画 - 录音中
      pulseScale.value = withRepeat(
        withSequence(withTiming(1.1, { duration: 600 }), withTiming(1, { duration: 600 })),
        -1,
        true
      );
      ringScale.value = withRepeat(withTiming(1.8, { duration: 1200 }), -1, false);
      ringOpacity.value = withRepeat(
        withSequence(withTiming(0.3, { duration: 600 }), withTiming(0, { duration: 600 })),
        -1,
        false
      );
    } else {
      pulseScale.value = 1;
      ringScale.value = 1;
      ringOpacity.value = 0;
    }
  }, [isListening]);

  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulseScale.value }] }));
  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.ring, ringStyle]} />
      <Pressable onPress={onPress}>
        <Animated.View style={[styles.button, pulseStyle]}>
          <Microphone size={24} color="#FFF" weight="fill" />
        </Animated.View>
      </Pressable>
    </View>
  );
};
```

---

### 组件 17: MatchRadarChart — 匹配度雷达图（重写）

**文件位置：** `src/design-system/ui/MatchRadarChart.tsx`（重写）

```typescript
// 关键改进：从静态SVG → 动画SVG
// 1. 整体从0到目标值弹性展开 (withSpring(1, gentle))
// 2. 分数数字从0到目标值滚动 (withTiming(score, {duration:800}))
// 3. 填充区域使用品牌色渐变 (terracotta → camel)
// 4. 数据点高亮：悬浮发光效果

import React, { useEffect, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, {
  Polygon,
  Circle,
  Line,
  G,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { DesignTokens } from "../../theme/tokens/design-tokens";
import { SpringConfigs } from "../theme/tokens/animations";

export const MatchRadarChart: React.FC<MatchRadarChartProps> = ({
  scores,
  size = 200,
  showLabels = true,
  showScoreList = true,
  accentColor,
}) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(1, SpringConfigs.gentle);
  }, [scores]);

  // 使用 progress.value 插值所有分数值
  // 在 worklet 中计算 animatedDataPoints
  // 使用 react-native-svg 的 animatedProps 传递动态 points

  // ... (保留原有SVG绘制逻辑，但所有值乘以 progress.value)

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgLinearGradient id="radarFill" x1="0" y1="0" x2="1" y2="1">
            <Stop
              offset="0"
              stopColor={accentColor ?? DesignTokens.colors.brand.terracotta}
              stopOpacity="0.3"
            />
            <Stop offset="1" stopColor={DesignTokens.colors.brand.camel} stopOpacity="0.15" />
          </SvgLinearGradient>
        </Defs>
        {/* 网格、轴线、数据多边形、数据点、标签 */}
      </Svg>
    </View>
  );
};
```

---

## Page 4: ProfileScreen（个人中心）

### 组件 18: ProfileHeader — 个人信息头部

**文件位置：** `src/features/profile/components/ProfileHeader.tsx`

```typescript
// 核心组成：渐变背景 + 头像(带在线状态) + 姓名 + 风格标签
// 动效：头像呼吸光环 + 渐变背景微妙流动
```

---

### 组件 19: StyleTagCloud — 风格标签云

**文件位置：** `src/features/profile/components/StyleTagCloud.tsx`

```typescript
// 核心动效：标签交错出现 (PopIn rubber) + 按压弹性
// 每个标签：圆角胶囊 + 不同透明度品牌色背景
// 布局：Flow/Wrap布局自动换行
```

---

### 组件 20: StatsCard — 统计卡片

**文件位置：** `src/features/profile/components/StatsCard.tsx`

```typescript
import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";

interface StatsCardProps {
  label: string;
  value: number;
  suffix?: string;
  icon: React.ReactNode;
}

export const StatsCard: React.FC<StatsCardProps> = ({ label, value, suffix = "", icon }) => {
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    animatedValue.value = withTiming(value, { duration: 1000 });
  }, [value]);

  return (
    <View style={styles.card}>
      {icon}
      <Animated.Text style={styles.value}>
        {/* 使用 useAnimatedProps 或 Reanimated Text 显示动画数字 */}
        {Math.round(animatedValue.value)}
        {suffix}
      </Animated.Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};
```

---

## 跨页面组件

### 组件 21: AnimatedTabBar — 底部导航栏

**文件位置：** `src/shared/components/AnimatedTabBar.tsx`

```typescript
import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { House, MagnifyingGlass, ChatCircle, User } from "phosphor-react-native";

export const AnimatedTabBar: React.FC<any> = ({ state, descriptors, navigation }) => {
  const indicatorPosition = useSharedValue(0);

  // 图标映射
  const tabIcons = [House, MagnifyingGlass, ChatCircle, User];

  return (
    <View style={styles.container}>
      <BlurView intensity={60} tint="light" style={styles.blur}>
        {/* 滑动指示器 */}
        <Animated.View style={[styles.indicator, indicatorAnimatedStyle]} />
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const IconComponent = tabIcons[index];
          return (
            <Pressable key={route.key} onPress={() => navigation.navigate(route.name)}>
              <Animated.View style={styles.tabItem}>
                <IconComponent
                  size={24}
                  weight={isFocused ? "fill" : "regular"}
                  color={
                    isFocused
                      ? DesignTokens.colors.brand.terracotta
                      : DesignTokens.colors.neutral[400]
                  }
                />
                <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>
                  {descriptors[route.key].options.title}
                </Text>
              </Animated.View>
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
};
```

---

### 组件 22: PageTransition — 页面转场动画

**文件位置：** `src/shared/navigation/PageTransition.tsx`

```typescript
// 使用已有的 PageTransitions 配置 (animations.ts:235-284)
// push: translateX 400→0 + opacity (snappy)
// modal: translateY 900→0 + opacity (gentle)
// fade: opacity + scale 0.98→1 (timing 300ms)
// flip: rotateY 90→0 (timing 400ms)
// 自定义screenOptions集成到Navigator
```

---

### 组件 23: LoadingSkeleton — 高级骨架屏

**文件位置：** `src/design-system/skeleton/AdvancedSkeleton.tsx`

```typescript
// 多种骨架模板：卡片、列表、聊天消息、商品网格
// 核心复用项目已有的 SkeletonLoader (FluidAnimations.tsx:521-553)
// shimmer效果：从左到右光泽流动 (translateX -200→200, 1500ms循环)
// 新增：根据type参数切换不同的骨架布局
//   'card' → 图片占位 + 标题条 + 副标题条 + 价格条
//   'list' → 头像圆 + 标题条 + 描述条
//   'chat' → 气泡形状骨架
//   'grid' → 2列商品卡片骨架
```

---

### 组件 24: PullToRefresh — 自定义下拉刷新

**文件位置：** `src/shared/components/PullToRefresh.tsx`

```typescript
// 自定义刷新动画：品牌色旋转圆环
// 替代系统默认的RefreshControl
// 核心动效：
//   下拉时：圆环跟随手指旋转
//   刷新中：圆环持续旋转 (withRepeat)
//   完成时：圆环弹性消失 + checkmark出现
// 使用 react-native-reanimated 的 useAnimatedScrollHandler
```

---

### 组件 25: Toast — 弹性通知组件

**文件位置：** `src/design-system/primitives/Toast/Toast.tsx`（增强）

```typescript
import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import { CheckCircle, Warning, Info } from "phosphor-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { SpringConfigs } from "../../theme/tokens/animations";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  visible: boolean;
  onHide: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = "info",
  duration = 3000,
  visible,
  onHide,
}) => {
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    if (visible) {
      // 弹性滑入
      translateY.value = withSpring(0, SpringConfigs.bouncy);
      opacity.value = withSpring(1, SpringConfigs.snappy);
      scale.value = withSpring(1, SpringConfigs.bouncy);
      // 自动消失
      translateY.value = withDelay(duration, withTiming(-100, { duration: 300 }));
      opacity.value = withDelay(duration, withTiming(0, { duration: 300 }));
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  const icons = { success: CheckCircle, error: Warning, info: Info, warning: Warning };
  const Icon = icons[type];

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <BlurView intensity={60} tint="light" style={styles.blur}>
        <Icon size={20} weight="fill" color={getColor(type)} />
        <Text style={styles.message}>{message}</Text>
      </BlurView>
    </Animated.View>
  );
};
```

---

## 依赖安装命令

```bash
cd C:\AiNeed\apps\mobile

# 必装
pnpm add phosphor-react-native lottie-react-native @shopify/react-native-skia react-native-svg @shopify/flash-list

# 推荐
pnpm add @gorhom/react-native-animated-tabbar react-native-reanimated-carousel react-native-fast-image

# 如果需要SVG动画（雷达图重写）
pnpm add react-native-svg
```

---

## 执行顺序建议

### Wave 1 — 基础组件（跨页面）

1. 安装新依赖
2. 组件 21: AnimatedTabBar
3. 组件 23: LoadingSkeleton
4. 组件 25: Toast
5. 组件 22: PageTransition

### Wave 2 — 首页（P0）

6. 组件 1: GlassHeader
7. 组件 2: WeatherSceneCard
8. 组件 3: OutfitCarousel
9. 组件 4: OutfitCard（重写）
10. 组件 5: AiInsightBubble
11. 组件 6: QuickReplyButtons
12. 集成到 TodayScreen

### Wave 3 — 造型师（P1）

13. 组件 12: ChatBubble（重写）
14. 组件 14: TypingIndicator
15. 组件 16: VoiceButton
16. 组件 17: MatchRadarChart（重写）
17. 组件 10: MatchScoreBadge
18. 组件 15: QuickReplyBar
19. 组件 13: OutfitResultBubble
20. 集成到 StylistScreen

### Wave 4 — 发现页（P2）

21. 组件 7: SearchBar
22. 组件 8: ScenePills
23. 组件 9: ProductFeedCard
24. 组件 11: RecommendReasonTag
25. 组件 24: PullToRefresh
26. 集成到 DiscoverScreen

### Wave 5 — 个人中心（P3）

27. 组件 18: ProfileHeader
28. 组件 19: StyleTagCloud
29. 组件 20: StatsCard
30. 集成到 ProfileScreen

---

_此文件为执行窗口的唯一行动指南。每个组件必须按此标准实现。_
