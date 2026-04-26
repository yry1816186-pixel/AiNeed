import React, { useCallback, useMemo, useState } from "react";
import { View } from "react-native";
import { FlashList } from "../../../polyfills/flash-list";
import { SearchBar } from "../components/SearchBar";
import { ScenePills } from "../components/ScenePills";
import { HotScenes } from "../components/HotScenes";
import { ProductFeed } from "../components/ProductFeed";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";
import { navigateTryOn } from "../../../navigation/navigationService";
import { EmptyState, ErrorState } from "../../../shared/components/states";
import { ShimmerSkeleton } from "../../../shared/components/animations/ShimmerSkeleton";
import { useDiscoverFeed } from "../../../shared/hooks/useQueryHooks";

type DiscoverSection =
  | { type: "search"; searchText: string }
  | { type: "scenes"; scenes: string[] | undefined; selectedScene: string | null }
  | { type: "hotScenes"; scenes: string[] | undefined }
  | { type: "productFeed" };

export function DiscoverScreen() {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const [searchText, setSearchText] = useState("");
  const [selectedScene, setSelectedScene] = useState<string | null>(null);

  const { data: feedData, isLoading, error, refetch } = useDiscoverFeed();

  const scenes = (feedData as unknown as Record<string, unknown>)?.scenes as string[] | undefined;

  const sections: DiscoverSection[] = useMemo(
    () => [
      { type: "search", searchText },
      { type: "scenes", scenes, selectedScene },
      { type: "hotScenes", scenes },
      { type: "productFeed" },
    ],
    [searchText, scenes, selectedScene]
  );

  const keyExtractor = useCallback((item: DiscoverSection, index: number) => item.type + index, []);

  const renderItem = useCallback(({ item }: { item: DiscoverSection }) => {
    switch (item.type) {
      case "search":
        return <SearchBar value={item.searchText} onChangeText={setSearchText} />;
      case "scenes":
        return (
          <ScenePills
            scenes={item.scenes || ["通勤", "约会", "运动"]}
            selectedScene={item.selectedScene}
            onSelect={setSelectedScene}
          />
        );
      case "hotScenes":
        return <HotScenes scenes={item.scenes} />;
      case "productFeed":
        return <ProductFeed onBrowseWardrobe={() => navigateTryOn("Wardrobe")} />;
    }
  }, []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <FlashList
          data={[
            { type: "search" as const, searchText },
            { type: "scenes" as const, scenes, selectedScene },
            { type: "hotScenes" as const, scenes },
          ]}
          renderItem={({ item }) => {
            if (item.type === "search") {
              return <SearchBar value={searchText} onChangeText={setSearchText} />;
            }
            return <ShimmerSkeleton width="100%" height={item.type === "scenes" ? 40 : 120} />;
          }}
          estimatedItemSize={80}
          contentContainerStyle={styles.scrollContent}
        />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <FlashList
          data={[{ type: "search" as const, searchText }]}
          renderItem={({ item }) => <SearchBar value={searchText} onChangeText={setSearchText} />}
          ListFooterComponent={
            <ErrorState
              title="加载失败"
              message="无法获取推荐内容，请稍后重试"
              onRetry={() => {
                void refetch();
              }}
              actionLabel="重新加载"
            />
          }
          estimatedItemSize={60}
          contentContainerStyle={styles.scrollContent}
        />
      </View>
    );
  }

  if (!feedData || (!feedData.items && !feedData.hasMore)) {
    return (
      <View style={styles.container}>
        <FlashList
          data={[{ type: "search" as const, searchText }]}
          renderItem={({ item }) => <SearchBar value={searchText} onChangeText={setSearchText} />}
          ListFooterComponent={
            <EmptyState
              illustration="search"
              title="还没有发现内容"
              description="去完成风格测试，解锁个性化推荐"
              actionLabel="做风格测试"
              onAction={() => navigateTryOn("Wardrobe")}
            />
          }
          estimatedItemSize={60}
          contentContainerStyle={styles.scrollContent}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlashList
        data={sections}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        estimatedItemSize={120}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const useStyles = createStyles((colors) => ({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 24,
  },
}));
