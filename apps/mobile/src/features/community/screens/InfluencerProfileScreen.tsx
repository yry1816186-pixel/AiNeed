import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { theme } from '../design-system/theme';
import { DesignTokens } from "../theme/tokens/design-tokens";
import { communityApi, type CommunityPost } from "../services/api/community.api";
import type { CommunityStackParamList } from "../navigation/types";

type InfluencerProfileRoute = RouteProp<CommunityStackParamList, "InfluencerProfile">;

const SCREEN_WIDTH = Dimensions.get("window").width;
const NUM_COLUMNS = 2;
const CARD_GAP = 10;
const CARD_WIDTH = (SCREEN_WIDTH - 32 - CARD_GAP) / NUM_COLUMNS;

export const InfluencerProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<InfluencerProfileRoute>();
  const influencerId = route.params?.influencerId;

  const [profile, setProfile] = useState<{
    id: string;
    nickname: string;
    avatar: string | null;
    bio: string;
    bloggerLevel?: string | null;
    followersCount: number;
    followingCount: number;
    postsCount: number;
    isFollowing: boolean;
  } | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"posts" | "outfits">("posts");

  const fetchData = useCallback(async () => {
    if (!influencerId) {
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const [profileRes, postsRes] = await Promise.all([
        communityApi.getUserProfile(influencerId),
        communityApi.getPosts({ authorId: influencerId, limit: 20 }),
      ]);
      if (profileRes.success && profileRes.data) {
        setProfile(profileRes.data);
      }
      if (postsRes.success && postsRes.data) {
        setPosts(postsRes.data.items);
      }
    } catch {
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [influencerId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handleFollowToggle = useCallback(async () => {
    if (!profile || followLoading) {
      return;
    }
    setFollowLoading(true);
    try {
      const response = await communityApi.toggleFollow(profile.id);
      if (response.success && response.data) {
        const following = response.data.following;
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                isFollowing: following,
                followersCount: prev.followersCount + (following ? 1 : -1),
              }
            : prev
        );
      }
    } catch (error) {
      console.error('Follow operation failed:', error);
    } finally {
      setFollowLoading(false);
    }
  }, [profile, followLoading]);

  const formatCount = (count: number) => {
    if (count >= 10000) {
      return `${(count / 10000).toFixed(1)}w`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return String(count);
  };

  const renderPostItem = useCallback(
    ({ item }: { item: CommunityPost }) => (
      <TouchableOpacity
        style={s.postCard}
        onPress={() => navigation.navigate("PostDetail", { postId: item.id })}
        activeOpacity={0.85}
      >
        {item.images[0] ? (
          <Image source={{ uri: item.images[0] }} style={s.postImage} resizeMode="cover" />
        ) : (
          <View style={s.postImagePlaceholder}>
            <Ionicons name="image-outline" size={24} color={theme.colors.textTertiary} />
          </View>
        )}
        <View style={s.postInfo}>
          <Text style={s.postTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={s.postStats}>
            <Ionicons name="heart-outline" size={12} color={theme.colors.textTertiary} />
            <Text style={s.postStatText}>{formatCount(item.likesCount)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    ),
    [navigation]
  );

  if (loading && !profile) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Profile</Text>
          <View style={s.iconBtn} />
        </View>
        <View style={s.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !profile) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Profile</Text>
          <View style={s.iconBtn} />
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
        <Text style={s.headerTitle}>{profile?.nickname ?? "Profile"}</Text>
        <TouchableOpacity style={s.iconBtn}>
          <Ionicons name="ellipsis-horizontal" size={22} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Profile section */}
        <View style={s.profileSection}>
          <View style={s.avatarRow}>
            {profile?.avatar ? (
              <Image source={{ uri: profile.avatar }} style={s.avatar} />
            ) : (
              <View style={s.avatarPlaceholder}>
                <Ionicons name="person" size={28} color={theme.colors.surface} />
              </View>
            )}
            <View style={s.statsRow}>
              <View style={s.statItem}>
                <Text style={s.statNumber}>{formatCount(profile?.postsCount ?? 0)}</Text>
                <Text style={s.statLabel}>Posts</Text>
              </View>
              <View style={s.statItem}>
                <Text style={s.statNumber}>{formatCount(profile?.followersCount ?? 0)}</Text>
                <Text style={s.statLabel}>Followers</Text>
              </View>
              <View style={s.statItem}>
                <Text style={s.statNumber}>{formatCount(profile?.followingCount ?? 0)}</Text>
                <Text style={s.statLabel}>Following</Text>
              </View>
            </View>
          </View>

          <Text style={s.nickname}>{profile?.nickname}</Text>
          {profile?.bloggerLevel && (
            <View style={s.badge}>
              <Ionicons name="checkmark-circle" size={12} color={DesignTokens.colors.neutral.white} />
              <Text style={s.badgeText}>
                {profile.bloggerLevel === "big_v" ? "Big V" : "Blogger"}
              </Text>
            </View>
          )}
          {profile?.bio ? <Text style={s.bio}>{profile.bio}</Text> : null}

          <TouchableOpacity
            style={[s.followBtn, profile?.isFollowing && s.followingBtn]}
            onPress={handleFollowToggle}
            disabled={followLoading}
          >
            {followLoading ? (
              <ActivityIndicator
                size="small"
                color={profile?.isFollowing ? theme.colors.text : DesignTokens.colors.neutral.white}
              />
            ) : (
              <Text style={[s.followBtnText, profile?.isFollowing && s.followingBtnText]}>
                {profile?.isFollowing ? "Following" : "Follow"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Tab bar */}
        <View style={s.tabBar}>
          <TouchableOpacity
            style={[s.tab, activeTab === "posts" && s.tabActive]}
            onPress={() => setActiveTab("posts")}
          >
            <Ionicons
              name="grid-outline"
              size={20}
              color={activeTab === "posts" ? theme.colors.primary : theme.colors.textTertiary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tab, activeTab === "outfits" && s.tabActive]}
            onPress={() => setActiveTab("outfits")}
          >
            <Ionicons
              name="shirt-outline"
              size={20}
              color={activeTab === "outfits" ? theme.colors.primary : theme.colors.textTertiary}
            />
          </TouchableOpacity>
        </View>

        {/* Posts grid */}
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderPostItem}
          numColumns={NUM_COLUMNS}
          scrollEnabled={false}
          columnWrapperStyle={{ gap: CARD_GAP }}
          contentContainerStyle={{ gap: CARD_GAP, paddingBottom: 24 }}
          ListEmptyComponent={
            <View style={s.emptyPosts}>
              <Ionicons name="images-outline" size={36} color={theme.colors.textTertiary} />
              <Text style={s.emptyText}>No posts yet</Text>
            </View>
          }
        />
      </ScrollView>
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
  headerTitle: { fontSize: 18, fontWeight: "700", color: theme.colors.text },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  centerContent: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { fontSize: 14, color: theme.colors.error, marginTop: 12 },
  retryBtn: {
    marginTop: 16,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryBtnText: { color: theme.colors.surface, fontSize: 14, fontWeight: "600" },
  scrollView: { flex: 1 },
  profileSection: {
    backgroundColor: theme.colors.surface,
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  avatarRow: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: theme.colors.placeholderBg },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: { flex: 1, flexDirection: "row", justifyContent: "space-around", marginLeft: 20 },
  statItem: { alignItems: "center" },
  statNumber: { fontSize: 18, fontWeight: "700", color: theme.colors.text },
  statLabel: { fontSize: 12, color: theme.colors.textTertiary, marginTop: 2 },
  nickname: { fontSize: 18, fontWeight: "700", color: theme.colors.textPrimary, marginTop: 14 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: DesignTokens.colors.brand.slate,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: 6,
  },
  badgeText: { fontSize: 11, fontWeight: "600", color: DesignTokens.colors.neutral.white },
  bio: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 8, lineHeight: 20 },
  followBtn: {
    marginTop: 14,
    backgroundColor: theme.colors.primary,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: "center",
  },
  followingBtn: { backgroundColor: theme.colors.subtleBg },
  followBtnText: { color: DesignTokens.colors.neutral.white, fontSize: 14, fontWeight: "600" },
  followingBtnText: { color: theme.colors.text },
  tabBar: {
    flexDirection: "row",
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: theme.colors.primary },
  postCard: {
    width: CARD_WIDTH,
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    overflow: "hidden",
  },
  postImage: { width: "100%", height: CARD_WIDTH, backgroundColor: theme.colors.placeholderBg },
  postImagePlaceholder: {
    width: "100%",
    height: CARD_WIDTH,
    backgroundColor: theme.colors.subtleBg,
    alignItems: "center",
    justifyContent: "center",
  },
  postInfo: { padding: 8 },
  postTitle: { fontSize: 12, fontWeight: "500", color: theme.colors.textPrimary, lineHeight: 16 },
  postStats: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 4 },
  postStatText: { fontSize: 11, color: theme.colors.textTertiary },
  emptyPosts: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: { fontSize: 14, color: theme.colors.textTertiary, marginTop: 8 },
});

export default InfluencerProfileScreen;
