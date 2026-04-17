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
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import { communityApi, type CommunityPost } from '../../../services/api/community.api';
import type { CommunityStackParamList } from '../../../navigation/types';
import { Spacing, flatColors as staticColors } from '../../../design-system/theme';


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
    const { colors } = useTheme();
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
        onPress={() => (navigation as any).navigate("PostDetail", { postId: item.id })}
        activeOpacity={0.85}
      >
        {item.images[0] ? (
          <Image source={{ uri: item.images[0] }} style={s.postImage} resizeMode="cover" />
        ) : (
          <View style={s.postImagePlaceholder}>
            <Ionicons name="image-outline" size={24} color={staticColors.textTertiary} />
          </View>
        )}
        <View style={s.postInfo}>
          <Text style={s.postTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={s.postStats}>
            <Ionicons name="heart-outline" size={12} color={staticColors.textTertiary} />
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
            <Ionicons name="chevron-back" size={24} color={staticColors.textPrimary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Profile</Text>
          <View style={s.iconBtn} />
        </View>
        <View style={s.centerContent}>
          <ActivityIndicator size="large" color={staticColors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error && !profile) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.iconBtn}>
            <Ionicons name="chevron-back" size={24} color={staticColors.textPrimary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Profile</Text>
          <View style={s.iconBtn} />
        </View>
        <View style={s.centerContent}>
          <Ionicons name="alert-circle-outline" size={48} color={staticColors.textTertiary} />
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
          <Ionicons name="chevron-back" size={24} color={staticColors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{profile?.nickname ?? "Profile"}</Text>
        <TouchableOpacity style={s.iconBtn}>
          <Ionicons name="ellipsis-horizontal" size={22} color={staticColors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={staticColors.primary}
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
                <Ionicons name="person" size={28} color={staticColors.surface} />
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
              <Ionicons name="checkmark-circle" size={12} color={staticColors.surface} />
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
                color={profile?.isFollowing ? staticColors.textPrimary : staticColors.surface}
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
              color={activeTab === "posts" ? staticColors.primary : staticColors.textTertiary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tab, activeTab === "outfits" && s.tabActive]}
            onPress={() => setActiveTab("outfits")}
          >
            <Ionicons
              name="shirt-outline"
              size={20}
              color={activeTab === "outfits" ? staticColors.primary : staticColors.textTertiary}
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
          contentContainerStyle={{ gap: CARD_GAP, paddingBottom: Spacing.lg}}
          ListEmptyComponent={
            <View style={s.emptyPosts}>
              <Ionicons name="images-outline" size={36} color={staticColors.textTertiary} />
              <Text style={s.emptyText}>No posts yet</Text>
            </View>
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: staticColors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing[3],
    backgroundColor: staticColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.border,
  },
  headerTitle: { fontSize: DesignTokens.typography.sizes.lg, fontWeight: "700", color: staticColors.textPrimary },
  iconBtn: { width: DesignTokens.spacing[9], height: DesignTokens.spacing[9], alignItems: "center", justifyContent: "center" },
  centerContent: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorText: { fontSize: DesignTokens.typography.sizes.base, color: staticColors.error, marginTop: DesignTokens.spacing[3]},
  retryBtn: {
    marginTop: Spacing.md,
    backgroundColor: staticColors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: DesignTokens.spacing['2.5'],
    borderRadius: 20,
  },
  retryBtnText: { color: staticColors.surface, fontSize: DesignTokens.typography.sizes.base, fontWeight: "600" },
  scrollView: { flex: 1 },
  profileSection: {
    backgroundColor: staticColors.surface,
    padding: DesignTokens.spacing[5],
    borderBottomWidth: 1,
    borderBottomColor: staticColors.divider,
  },
  avatarRow: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: staticColors.placeholderBg },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: staticColors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: { flex: 1, flexDirection: "row", justifyContent: "space-around", marginLeft: DesignTokens.spacing[5]},
  statItem: { alignItems: "center" },
  statNumber: { fontSize: DesignTokens.typography.sizes.lg, fontWeight: "700", color: staticColors.textPrimary },
  statLabel: { fontSize: DesignTokens.typography.sizes.sm, color: staticColors.textTertiary, marginTop: DesignTokens.spacing['0.5']},
  nickname: { fontSize: DesignTokens.typography.sizes.lg, fontWeight: "700", color: staticColors.textPrimary, marginTop: DesignTokens.spacing['3.5']},
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    backgroundColor: staticColors.neutral[500],
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginTop: DesignTokens.spacing['1.5'],
  },
  badgeText: { fontSize: DesignTokens.typography.sizes.xs, fontWeight: "600", color: staticColors.surface },
  bio: { fontSize: DesignTokens.typography.sizes.base, color: staticColors.textSecondary, marginTop: Spacing.sm, lineHeight: 20 },
  followBtn: {
    marginTop: DesignTokens.spacing['3.5'],
    backgroundColor: staticColors.primary,
    paddingVertical: DesignTokens.spacing['2.5'],
    borderRadius: 20,
    alignItems: "center",
  },
  followingBtn: { backgroundColor: staticColors.subtleBg },
  followBtnText: { color: staticColors.surface, fontSize: DesignTokens.typography.sizes.base, fontWeight: "600" },
  followingBtnText: { color: staticColors.textPrimary },
  tabBar: {
    flexDirection: "row",
    backgroundColor: staticColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: staticColors.divider,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: DesignTokens.spacing[3],
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: staticColors.primary },
  postCard: {
    width: CARD_WIDTH,
    backgroundColor: staticColors.surface,
    borderRadius: 10,
    overflow: "hidden",
  },
  postImage: { width: "100%", height: CARD_WIDTH, backgroundColor: staticColors.placeholderBg },
  postImagePlaceholder: {
    width: "100%",
    height: CARD_WIDTH,
    backgroundColor: staticColors.subtleBg,
    alignItems: "center",
    justifyContent: "center",
  },
  postInfo: { padding: Spacing.sm},
  postTitle: { fontSize: DesignTokens.typography.sizes.sm, fontWeight: "500", color: staticColors.textPrimary, lineHeight: 16 },
  postStats: { flexDirection: "row", alignItems: "center", gap: Spacing.xs, marginTop: Spacing.xs},
  postStatText: { fontSize: DesignTokens.typography.sizes.xs, color: staticColors.textTertiary },
  emptyPosts: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: { fontSize: DesignTokens.typography.sizes.base, color: staticColors.textTertiary, marginTop: Spacing.sm},
});

export default InfluencerProfileScreen;
