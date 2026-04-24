import { View, ScrollView } from "react-native";
import { WeatherSceneCard } from "../components/WeatherSceneCard";
import { RecommendationCarousel } from "../components/RecommendationCarousel";
import { RecommendationFunnel } from "../components/RecommendationFunnel";
import { QuickChatBar } from "../components/QuickChatBar";
import { GlassHeader } from "../components/GlassHeader";
import { AiInsightBubble } from "../components/AiInsightBubble";
import { QuickReplyButtons } from "../components/QuickReplyButtons";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";
import { EmptyState, ErrorState } from "../../../shared/components/states";
import { ShimmerSkeleton } from "../../../shared/components/animations/ShimmerSkeleton";
import { navigateStylist } from "../../../navigation/navigationService";
import { useTodayRecommendations, useWeather } from "../../../shared/hooks/useQueryHooks";
import { useDemoStore } from "../../../shared/stores/demoStore";

export function TodayScreen() {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const demoMode = useDemoStore((s) => s.demoMode);

  const {
    data: recommendations,
    isLoading: recLoading,
    error: recError,
    refetch: refetchRec,
  } = useTodayRecommendations();
  const { data: weather, isLoading: weatherLoading } = useWeather();

  const isLoading = recLoading || weatherLoading;

  if (isLoading) {
    return (
      <View style={styles.container}>
        <GlassHeader title="今天穿什么" subtitle="让伊伊为你推荐" />
        <View style={styles.loadingWrapper}>
          <ShimmerSkeleton width="100%" height={120} style={{ marginBottom: 16 }} />
          <ShimmerSkeleton width="100%" height={200} style={{ marginBottom: 16 }} />
          <ShimmerSkeleton width="100%" height={80} />
        </View>
        <QuickChatBar />
      </View>
    );
  }

  if (recError) {
    return (
      <View style={styles.container}>
        <GlassHeader title="今天穿什么" subtitle="让伊伊为你推荐" />
        <View style={styles.emptyWrapper}>
          <ErrorState
            title="加载失败"
            message="抱歉，发生了一些错误，请稍后重试"
            onRetry={() => refetchRec()}
            actionLabel="重新加载推荐"
          />
        </View>
        <QuickChatBar />
      </View>
    );
  }

  if (!recommendations || !recommendations.items || recommendations.items.length === 0) {
    return (
      <View style={styles.container}>
        <GlassHeader title="今天穿什么" subtitle="让伊伊为你推荐" />
        <View style={styles.emptyWrapper}>
          <EmptyState
            illustration="empty-box"
            title="今天还没有推荐"
            description="伊伊正在根据天气和场景为你搭配"
            actionLabel="看看昨天推荐"
            onAction={() => navigateStylist("AIStylist")}
          />
        </View>
        <QuickChatBar />
      </View>
    );
  }

  const handleQuickReply = (option: string) => {
    navigateStylist("AIStylist", { initialMessage: option });
  };

  return (
    <View style={styles.container}>
      <GlassHeader title="今天穿什么" subtitle="让伊伊为你推荐" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <WeatherSceneCard
          weather={
            weather
              ? {
                  temp: weather.temperature,
                  condition: weather.condition || weather.description,
                  icon: weather.icon || "sun",
                }
              : undefined
          }
          scene={{
            title: recommendations.outfit?.name || "今日推荐",
            description:
              recommendations.outfit?.description || recommendations.explanation?.why || "",
          }}
        />
        <RecommendationCarousel items={recommendations.items} />
        {recommendations?.breakdown && (__DEV__ || demoMode) && (
          <RecommendationFunnel breakdown={recommendations.breakdown} />
        )}
        <AiInsightBubble message={recommendations.explanation?.why || ""} />
        <QuickReplyButtons
          options={[
            recommendations.explanation?.nextAction || "换一套",
            "推荐通勤穿搭",
            "约会风格",
          ]}
          onSelect={handleQuickReply}
        />
      </ScrollView>
      <QuickChatBar />
    </View>
  );
}

const useStyles = createStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  emptyWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingWrapper: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
}));
