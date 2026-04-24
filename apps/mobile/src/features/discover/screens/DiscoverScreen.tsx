import React, { useState } from "react";
import { View, ScrollView } from "react-native";
import { SearchBar } from "../components/SearchBar";
import { ScenePills } from "../components/ScenePills";
import { HotScenes } from "../components/HotScenes";
import { ProductFeed } from "../components/ProductFeed";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";

const SAMPLE_SCENES = ["通勤", "约会", "运动", "街头", "度假", "派对"];

export function DiscoverScreen() {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const [searchText, setSearchText] = useState("");
  const [selectedScene, setSelectedScene] = useState<string | null>(null);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <SearchBar value={searchText} onChangeText={setSearchText} />
        <ScenePills
          scenes={SAMPLE_SCENES}
          selectedScene={selectedScene}
          onSelect={setSelectedScene}
        />
        <HotScenes />
        <ProductFeed />
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
