import React, { useState } from "react";
import { View, ScrollView } from "react-native";
import { SearchBar } from "../components/SearchBar";
import { ScenePills } from "../components/ScenePills";
import { HotScenes } from "../components/HotScenes";
import { ProductFeed } from "../components/ProductFeed";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";
import { navigateTryOn } from "../../../navigation/navigationService";
import { EmptyState, ErrorState } from "../../../shared/components/states";
import { ShimmerSkeleton } from "../../../shared/components/animations/ShimmerSkeleton";
import { useDiscoverFeed } from "../../../shared/hooks/useQueryHooks";

export function DiscoverScreen() {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const [searchText, setSearchText] = useState("");
  const [selectedScene, setSelectedScene] = useState<string | null>(null);

  const { data: feedData, isLoading, error, refetch } = useDiscoverFeed();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <SearchBar value={searchText} onChangeText={setSearchText} />
          <View style={{ paddingHorizontal: 16, gap: 12 }}>
            <ShimmerSkeleton width="100%" height={40} />
            <ShimmerSkeleton width="100%" height={120} />
            <ShimmerSkeleton width="100%" height={200} />
          </View>
        </ScrollView>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <SearchBar value={searchText} onChangeText={setSearchText} />
          <ErrorState
            title="加载失败"
            message="无法获取推荐内容，请稍后重试"
            onRetry={() => refetch()}
            actionLabel="重新加载"
          />
        </ScrollView>
      </View>
    );
  }

  if (!feedData || (!feedData.items && !feedData.hasMore)) {
    return (
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <SearchBar value={searchText} onChangeText={setSearchText} />
          <EmptyState
            illustration="search"
            title="还没有发现内容"
            message="去完成风格测试，解锁个性化推荐"
            actionLabel="做风格测试"
            onAction={() => navigateTryOn("Wardrobe")}
          />
        </ScrollView>
      </View>
    );
  }

  const scenes = (feedData as Record<string, unknown>)?.scenes as string[] | undefined;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <SearchBar value={searchText} onChangeText={setSearchText} />
        <ScenePills
          scenes={scenes || ["通勤", "约会", "运动"]}
          selectedScene={selectedScene}
          onSelect={setSelectedScene}
        />
        <HotScenes scenes={scenes} />
        <ProductFeed onBrowseWardrobe={() => navigateTryOn("Wardrobe")} />
      </ScrollView>
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
    paddingBottom: 24,
  },
}));
