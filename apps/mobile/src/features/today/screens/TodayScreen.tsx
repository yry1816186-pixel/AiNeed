import { View, ScrollView } from "react-native";
import { WeatherSceneCard } from "../components/WeatherSceneCard";
import { RecommendationCarousel } from "../components/RecommendationCarousel";
import { QuickChatBar } from "../components/QuickChatBar";
import { GlassHeader } from "../components/GlassHeader";
import { AiInsightBubble } from "../components/AiInsightBubble";
import { QuickReplyButtons } from "../components/QuickReplyButtons";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";

export function TodayScreen() {
  const { colors } = useTheme();
  const styles = useStyles(colors);

  return (
    <View style={styles.container}>
      <GlassHeader title="今天穿什么" subtitle="让伊伊为你推荐" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <WeatherSceneCard
          weather={{ temp: 22, condition: "晴", icon: "sun" }}
          scene={{ title: "周末出行", description: "让伊伊推荐一套轻松又时尚的穿搭" }}
        />
        <RecommendationCarousel />
        <AiInsightBubble message="今天的阳光正好，暖色调穿搭会让你更有活力。试试搭配一条米色阔腿裤？" />
        <QuickReplyButtons
          options={["推荐通勤穿搭", "约会风格", "运动休闲", "换一套"]}
          onSelect={(option) => console.log("Selected:", option)}
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
}));
