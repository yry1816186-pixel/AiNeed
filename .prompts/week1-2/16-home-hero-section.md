# 任务16: HomeScreen Hero Section + 场景化推荐轮播

## 你的角色

寻裳(AiNeed)项目移动端开发工程师。项目位于 C:\AiNeed，React Native。

## 背景

当前HomeScreen缺少差异化的首屏体验。需要添加Hero Section（个性化问候+AI洞察）和场景化推荐轮播。

## 必读文件

1. `apps/mobile/src/features/home/screens/HomeScreen.tsx` — 当前首页
2. `apps/mobile/src/features/home/components/` — 现有组件
3. `apps/mobile/src/design-system/theme/tokens/design-tokens.ts` — 设计令牌
4. `apps/mobile/src/stores/` — 状态管理（找用户信息store）

## 任务

### 1. 创建 WeatherGreeting 组件

创建/重写 `apps/mobile/src/features/home/components/WeatherGreeting.tsx`：

```typescript
interface Props {
  userName: string;
  weather?: { temp: number; description: string };
  wardrobeCount?: number;
}

export const WeatherGreeting: React.FC<Props> = ({ userName, weather, wardrobeCount }) => (
  <LinearGradient
    colors={['#FF6B6B', '#F0C987']}  // 品牌渐变
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.container}
  >
    <Text style={styles.greeting}>
      Hi, {userName}
    </Text>
    <Text style={styles.insight}>
      {getInsightMessage(weather, wardrobeCount)}
    </Text>
  </LinearGradient>
);

function getInsightMessage(weather?: WeatherData, wardrobeCount?: number): string {
  if (weather && weather.temp < 10) {
    return `今天降温到${weather.temp}度，你衣柜里有 ${wardrobeCount || '几'} 件适合的外套`;
  }
  if (weather && weather.temp > 30) {
    return `今天${weather.temp}度高温，推荐清凉透气的搭配`;
  }
  // 随机轮换
  const messages = [
    '今天想穿什么风格？让我帮你搭配',
    '你的春季色彩是暖春型，推荐试试珊瑚色系',
    '发现3件新品很匹配你的风格',
  ];
  return messages[Math.floor(Date.now() / 3600000) % messages.length]; // 每小时换一条
}
```

### 2. 创建场景化推荐轮播

创建 `apps/mobile/src/features/home/components/SceneCarousel.tsx`：

**设计**：

- 横向 Snap 轮播，卡片宽度 = 屏宽62%
- 每张卡片：穿搭效果图（用placeholder） + 场景标签 + 匹配度评分
- 左右滑动浏览

```typescript
import { ScrollView } from 'react-native';
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated';

interface SceneCard {
  id: string;
  scene: string;      // 约会/通勤/休闲/运动/正式
  imageUrl: string;
  matchScore: number;  // 0-100
  description: string;
}

interface Props {
  cards: SceneCard[];
  onCardPress: (card: SceneCard) => void;
}

const CARD_WIDTH = SCREEN_WIDTH * 0.62;
const CARD_GAP = 12;

export const SceneCarousel: React.FC<Props> = ({ cards, onCardPress }) => {
  const scrollX = useSharedValue(0);

  return (
    <View>
      <View style={styles.header}>
        <Text style={styles.title}>为你推荐</Text>
        <Text style={styles.seeAll}>查看全部</Text>
      </View>
      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_WIDTH + CARD_GAP}
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
        onScroll={useAnimatedScrollHandler({ onScroll: (e) => { scrollX.value = e.contentOffset.x; } })}
        scrollEventThrottle={16}
      >
        {cards.map((card, index) => (
          <TouchableOpacity
            key={card.id}
            style={styles.card}
            onPress={() => onCardPress(card)}
            activeOpacity={0.9}
          >
            <Image source={{ uri: card.imageUrl }} style={styles.cardImage} />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.cardOverlay}
            >
              <View style={styles.sceneTag}>
                <Text style={styles.sceneText}>{card.scene}</Text>
              </View>
              <Text style={styles.cardDescription}>{card.description}</Text>
              <View style={styles.matchBadge}>
                <Text style={styles.matchText}>{card.matchScore}% 匹配</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </Animated.ScrollView>
      {/* 页面指示器 */}
      <View style={styles.dots}>
        {cards.map((_, i) => (
          <View key={i} style={[styles.dot, i === 0 && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
};
```

### 3. 创建 QuickActions 网格

创建/重写 `apps/mobile/src/features/home/components/QuickActions.tsx`：

2x2 圆形渐变图标网格：

```typescript
const actions = [
  { id: "stylist", label: "AI造型师", icon: "palette-outline", gradient: ["#FF6B6B", "#FF8E8E"] },
  { id: "tryon", label: "虚拟试穿", icon: "camera-outline", gradient: ["#B8E0D2", "#9AD0BC"] },
  { id: "wardrobe", label: "我的衣橱", icon: "hanger", gradient: ["#F0C987", "#E0B876"] },
  { id: "report", label: "风格报告", icon: "chart-donut", gradient: ["#7B8FA2", "#6A7E92"] },
];
```

每个按钮用LinearGradient圆形背景+白色图标，hover时有轻微缩放动画(withSpring 1.05)。

### 4. 集成到HomeScreen

修改HomeScreen，将新组件按顺序插入：

```
1. WeatherGreeting (Hero Section)
2. QuickActions (2x2网格)
3. ProfileCompletionBanner (如果画像未完成)
4. SceneCarousel (场景轮播)
5. SearchBar
6. RecommendationFeed (现有推荐流)
```

确保所有组件的import路径正确，数据来源合理（可先用mock数据）。

## 验证标准

- [ ] WeatherGreeting组件创建，显示个性化问候
- [ ] SceneCarousel组件创建，横向snap轮播
- [ ] QuickActions组件创建，2x2渐变网格
- [ ] HomeScreen正确集成所有新组件
- [ ] 使用design-tokens中的品牌色和渐变
- [ ] TypeScript编译无错误
