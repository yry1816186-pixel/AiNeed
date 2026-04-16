import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { theme } from '../design-system/theme';
import { DesignTokens } from "../theme/tokens/design-tokens";
import { communityApi } from "../services/api/community.api";
import type { CommunityStackParamList } from "../navigation/types";

type InspirationWardrobeRoute = RouteProp<CommunityStackParamList, "InspirationWardrobe">;

interface Collection {
  id: string;
  name: string;
  icon: string;
  itemCount: number;
}

interface InspirationItem {
  id: string;
  imageUrl: string;
  title: string;
  source: string;
}

export const InspirationWardrobeScreen: React.FC = () => {
  const navigation = useNavigation();
  const _route = useRoute<InspirationWardrobeRoute>();

  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [items, setItems] = useState<InspirationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCollections = useCallback(async () => {
    try {
      const response = await communityApi.getCollections();
      if (response.success && response.data) {
        const mapped: Collection[] = response.data.map((c) => ({
          id: c.id,
          name: c.name,
          icon: c.icon,
          itemCount: c._count?.items ?? 0,
        }));
        setCollections(mapped);
        if (mapped.length > 0 && !selectedCollection) {
          setSelectedCollection(mapped[0].id);
        }
      }
    } catch (error) {
      // Collections non-critical
      console.error('Failed to load collections:', error);
    }
  }, [selectedCollection]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await fetchCollections();

      // Fetch bookmarked posts as inspiration items
      const postsRes = await communityApi.getPosts({ limit: 30, sort: "popular" });
      if (postsRes.success && postsRes.data) {
        const mapped: InspirationItem[] = postsRes.data.items
          .filter((p) => p.images.length > 0)
          .map((p) => ({
            id: p.id,
            imageUrl: p.images[0],
            title: p.title || "Inspiration",
            source: p.author.nickname,
          }));
        setItems(mapped);
      }
    } catch {
      setError("Failed to load inspiration wardrobe");
    } finally {
      setLoading(false);
    }
  }, [fetchCollections]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handleCreateCollection = useCallback(async () => {
    Alert.prompt("New Collection", "Enter collection name", async (name) => {
      if (!name.trim()) {
        return;
      }
      const response = await communityApi.createCollection({ name: name.trim() });
      if (response.success) {
        await fetchCollections();
      }
    });
  }, [fetchCollections]);

  const renderItem = useCallback(
    ({ item }: { item: InspirationItem }) => (
      <TouchableOpacity style={s.gridItem} activeOpacity={0.85}>
        <Image source={{ uri: item.imageUrl }} style={s.gridImage} resizeMode="cover" />
        <View style={s.gridOverlay}>
          <Text style={s.gridTitle} numberOfLines={1}>
            {item.title}
          </Text>
        </View>
      </TouchableOpacity>
    ),
    []
  );

  const NUM_COLUMNS = 2;

  if (loading && items.length === 0) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Inspiration Wardrobe</Text>
          <TouchableOpacity style={s.iconBtn} onPress={handleCreateCollection}>
            <Ionicons name="add" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={s.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && items.length === 0) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Inspiration Wardrobe</Text>
          <TouchableOpacity style={s.iconBtn} onPress={handleCreateCollection}>
            <Ionicons name="add" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={s.centerContent}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.colors.textTertiary} />
          <Text style={s.errorText}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={fetchData}>
            <Text style={s.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Inspiration Wardrobe</Text>
        <TouchableOpacity style={s.iconBtn} onPress={handleCreateCollection}>
          <Ionicons name="add" size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Collection tabs */}
      {collections.length > 0 && (
        <View style={s.collectionRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.collectionScroll}
          >
            <TouchableOpacity
              style={[s.collectionChip, !selectedCollection && s.collectionChipActive]}
              onPress={() => setSelectedCollection(null)}
            >
              <Text
                style={[s.collectionChipText, !selectedCollection && s.collectionChipTextActive]}
              >
                All
              </Text>
            </TouchableOpacity>
            {collections.map((col) => (
              <TouchableOpacity
                key={col.id}
                style={[s.collectionChip, selectedCollection === col.id && s.collectionChipActive]}
                onPress={() => setSelectedCollection(col.id)}
              >
                <Text
                  style={[
                    s.collectionChipText,
                    selectedCollection === col.id && s.collectionChipTextActive,
                  ]}
                >
                  {col.icon} {col.name} ({col.itemCount})
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={NUM_COLUMNS}
        columnWrapperStyle={{ gap: 10 }}
        contentContainerStyle={{ gap: 10, padding: 16, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={s.emptyContent}>
            <Ionicons name="bookmarks-outline" size={48} color={theme.colors.textTertiary} />
            <Text style={s.emptyTitle}>No inspiration saved yet</Text>
            <Text style={s.emptySubtitle}>Browse the community and save posts you love</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: { fontSize: DesignTokens.typography.sizes.lg, fontWeight: "700", color: theme.colors.text },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  centerContent: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  errorText: { fontSize: DesignTokens.typography.sizes.base, color: theme.colors.error, marginTop: 12 },
  retryBtn: {
    marginTop: 16,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryBtnText: { color: theme.colors.surface, fontSize: DesignTokens.typography.sizes.base, fontWeight: "600" },
  collectionRow: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    maxHeight: 48,
  },
  collectionScroll: { paddingHorizontal: 16, paddingVertical: 8, gap: 8, alignItems: "center" },
  collectionChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
  },
  collectionChipActive: { backgroundColor: theme.colors.primary },
  collectionChipText: { fontSize: DesignTokens.typography.sizes.sm, color: theme.colors.textSecondary, fontWeight: "500" },
  collectionChipTextActive: { color: theme.colors.surface, fontWeight: "600" },
  gridItem: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: theme.colors.surface,
  },
  gridImage: { width: "100%", aspectRatio: 3 / 4, backgroundColor: theme.colors.placeholderBg },
  gridOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  gridTitle: { fontSize: DesignTokens.typography.sizes.sm, color: DesignTokens.colors.neutral.white, fontWeight: "500" },
  emptyContent: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyTitle: { fontSize: DesignTokens.typography.sizes.lg, fontWeight: "600", color: theme.colors.textPrimary, marginTop: 16 },
  emptySubtitle: {
    fontSize: DesignTokens.typography.sizes.base,
    color: theme.colors.textTertiary,
    marginTop: 8,
    textAlign: "center",
  },
});

export default InspirationWardrobeScreen;
