import React, { useEffect } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { SpringConfigs } from "../../../design-system/theme/tokens/animations";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  FadeInUp,
} from "react-native-reanimated";

interface ProfileHeaderProps {
  name: string;
  avatar?: string;
  styleTag?: string;
  isOnline?: boolean;
}

const AVATAR_SIZE = 80;
const RING_WIDTH = 3;
const ONLINE_DOT_SIZE = 14;
const STATS_CONFIG = [
  { key: "outfits", label: "穿搭数" },
  { key: "favorites", label: "收藏数" },
  { key: "score", label: "风格分" },
] as const;

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  name,
  avatar,
  styleTag,
  isOnline = false,
}) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const ringScale = useSharedValue(1);
  const contentOpacity = useSharedValue(0);

  useEffect(() => {
    ringScale.value = withRepeat(
      withSequence(withTiming(1.05, { duration: 2500 }), withTiming(1, { duration: 2500 })),
      -1,
      true
    );
    contentOpacity.value = withSpring(1, SpringConfigs.gentle);
  }, []);

  const ringAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: (1 - contentOpacity.value) * 8 }],
  }));

  const [c1, c2] = DesignTokens.gradients.brand;

  return (
    <View style={styles.container}>
      <View style={[styles.gradientBg, { backgroundColor: c1 }]} />
      <View style={[styles.gradientBg, styles.gradientBgEnd, { backgroundColor: c2 }]} />
      <View style={styles.content}>
        <View style={styles.avatarContainer}>
          <Animated.View style={[styles.avatarRing, ringAnimatedStyle]}>
            <View style={styles.avatarInner}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarPlaceholderText}>{name.charAt(0)}</Text>
                </View>
              )}
            </View>
          </Animated.View>

          {isOnline && <View style={styles.onlineDot} />}
        </View>

        <Animated.View
          style={[styles.infoSection, contentAnimatedStyle]}
          entering={FadeInUp.duration(400).delay(100)}
        >
          <Text style={styles.nameText} numberOfLines={1}>
            {name}
          </Text>
          {styleTag ? (
            <View style={styles.styleTagPill}>
              <Text style={styles.styleTagText}>{styleTag}</Text>
            </View>
          ) : null}
        </Animated.View>

        <Animated.View style={styles.statsRow} entering={FadeInUp.duration(400).delay(250)}>
          {STATS_CONFIG.map((stat, index) => (
            <View key={stat.key} style={styles.statColumn}>
              <View style={[styles.statDivider, index === 0 && styles.statDividerHidden]} />
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </Animated.View>
      </View>
    </View>
  );
};

const useStyles = createStyles((colors) => ({
  container: {
    height: 220,
    paddingTop: 48,
    overflow: "hidden",
  },
  gradientBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 1,
  },
  gradientBgEnd: {
    opacity: 0.6,
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: DesignTokens.spacing[4],
  },
  avatarContainer: {
    position: "relative",
    marginBottom: DesignTokens.spacing[3],
  },
  avatarRing: {
    width: AVATAR_SIZE + RING_WIDTH * 2,
    height: AVATAR_SIZE + RING_WIDTH * 2,
    borderRadius: (AVATAR_SIZE + RING_WIDTH * 2) / 2,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInner: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  avatarImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  avatarPlaceholderText: {
    fontSize: DesignTokens.typography.sizes["2xl"],
    fontWeight: "600",
    color: "#FFFFFF",
  },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: ONLINE_DOT_SIZE,
    height: ONLINE_DOT_SIZE,
    borderRadius: ONLINE_DOT_SIZE / 2,
    backgroundColor: DesignTokens.colors.semantic.success,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.8)",
  },
  infoSection: {
    alignItems: "center",
    marginBottom: DesignTokens.spacing[4],
  },
  nameText: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: DesignTokens.typography.sizes.xl * DesignTokens.typography.lineHeights.tight,
    letterSpacing: DesignTokens.typography.letterSpacing.wide,
  },
  styleTagPill: {
    marginTop: DesignTokens.spacing[1],
    paddingHorizontal: DesignTokens.spacing[3],
    paddingVertical: DesignTokens.spacing[0.5],
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: DesignTokens.borderRadius.full,
  },
  styleTagText: {
    fontSize: DesignTokens.typography.sizes.xs,
    fontWeight: "500",
    color: "#FFFFFF",
    letterSpacing: DesignTokens.typography.letterSpacing.wide,
  },
  statsRow: {
    flexDirection: "row",
    width: "100%",
    maxWidth: 280,
  },
  statColumn: {
    flex: 1,
    alignItems: "center",
    position: "relative",
  },
  statDivider: {
    position: "absolute",
    left: 0,
    top: 4,
    bottom: 4,
    width: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  statDividerHidden: {
    display: "none" as never,
  },
  statLabel: {
    fontSize: DesignTokens.typography.sizes.xs,
    fontWeight: "400",
    color: "rgba(255, 255, 255, 0.7)",
  },
}));

export default ProfileHeader;
