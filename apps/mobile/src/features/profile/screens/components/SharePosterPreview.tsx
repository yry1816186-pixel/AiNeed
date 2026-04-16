import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Dimensions,
} from "react-native";
import { Image } from "react-native";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { colors } from "@/src/theme/tokens/colors";
import { typography } from "@/src/theme/tokens/typography";
import { spacing } from "@/src/theme/tokens/spacing";
import { shadows } from "@/src/theme/tokens/shadows";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import { Spacing } from '../../../../design-system/theme';
import { useTheme, createStyles } from '../../../../shared/contexts/ThemeContext';


interface SharePosterPreviewProps {
  nickname: string;
  avatar?: string;
  bodyTypeName: string;
  colorSeasonName: string;
  styleTags: string[];
  personalityLine: string;
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const PREVIEW_WIDTH = SCREEN_WIDTH - spacing.layout.screenPadding * 2;
const PREVIEW_HEIGHT = PREVIEW_WIDTH * (4 / 3);

const ACTION_ITEMS = [
  { key: "album", label: "保存到相册", icon: "image-outline" as const },
  { key: "wechat", label: "分享到微信", icon: "chatbubble-outline" as const },
  { key: "moments", label: "分享到朋友圈", icon: "share-social-outline" as const },
];

export const SharePosterPreview: React.FC<SharePosterPreviewProps> = ({
  nickname,
  avatar,
  bodyTypeName,
  colorSeasonName,
  styleTags,
  personalityLine,
}) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const translateY = useSharedValue(400);

  const showActionSheet = useCallback(() => {
    setActionSheetVisible(true);
    translateY.value = withSpring(0, { damping: 20, stiffness: 150 });
  }, []);

  const hideActionSheet = useCallback(() => {
    translateY.value = withTiming(400, { duration: 200 }, (finished) => {
      if (finished) {
        runOnJS(setActionSheetVisible)(false);
      }
    });
  }, []);

  const animatedSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const topTags = styleTags.slice(0, 3);
  const displayName = nickname || "用户";
  const avatarInitial = displayName.charAt(0).toUpperCase();

  return (
    <View style={styles.container}>
      <View style={styles.previewCard}>
        <LinearGradient
          colors={colors.gradients.brand as unknown as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.posterGradient}
        >
          <View style={styles.posterContent}>
            <View style={styles.avatarCircle}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarInitial}>{avatarInitial}</Text>
              )}
            </View>

            <Text style={styles.nickname} accessibilityLabel={`昵称：${displayName}`}>
              {displayName}
            </Text>

            {personalityLine ? (
              <Text style={styles.personalityLine} accessibilityLabel={personalityLine}>
                {personalityLine}
              </Text>
            ) : null}

            <View style={styles.infoRow}>
              {bodyTypeName ? (
                <View style={styles.infoChip}>
                  <Ionicons name="body-outline" size={12} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.infoChipText}>{bodyTypeName}</Text>
                </View>
              ) : null}
              {colorSeasonName ? (
                <View style={styles.infoChip}>
                  <Ionicons name="color-palette-outline" size={12} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.infoChipText}>{colorSeasonName}</Text>
                </View>
              ) : null}
            </View>

            {topTags.length > 0 && (
              <View style={styles.tagsRow}>
                {topTags.map((tag) => (
                  <View key={tag} style={styles.posterTag}>
                    <Text style={styles.posterTagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <Text style={styles.watermark}>寻裳</Text>
        </LinearGradient>
      </View>

      <TouchableOpacity
        style={styles.generateButton}
        onPress={showActionSheet}
        activeOpacity={0.8}
        accessibilityLabel="生成海报"
        accessibilityRole="button"
      >
        <LinearGradient
          colors={colors.gradients.coralRose as unknown as [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.generateButtonGradient}
        >
          <Ionicons name="share-outline" size={18} color={colors.surface} />
          <Text style={styles.generateButtonText}>生成海报</Text>
        </LinearGradient>
      </TouchableOpacity>

      <Modal
        visible={actionSheetVisible}
        transparent
        animationType="none"
        onRequestClose={hideActionSheet}
      >
        <Pressable style={styles.overlay} onPress={hideActionSheet}>
          <Animated.View style={[styles.actionSheet, animatedSheetStyle]}>
            {ACTION_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={styles.actionItem}
                onPress={hideActionSheet}
                activeOpacity={0.6}
                accessibilityLabel={item.label}
                accessibilityRole="button"
              >
                <Ionicons name={item.icon} size={22} color={colors.neutral[700]} />
                <Text style={styles.actionItemText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
            <View style={styles.actionDivider} />
            <TouchableOpacity
              style={styles.actionCancel}
              onPress={hideActionSheet}
              activeOpacity={0.6}
              accessibilityLabel="取消"
              accessibilityRole="button"
            >
              <Text style={styles.actionCancelText}>取消</Text>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
};

const useStyles = createStyles((colors) => ({
  container: {
    alignItems: "center",
    marginHorizontal: spacing.layout.screenPadding,
    marginBottom: spacing.layout.cardGap,
  },
  previewCard: {
    width: PREVIEW_WIDTH,
    height: PREVIEW_HEIGHT,
    borderRadius: spacing.borderRadius["2xl"],
    overflow: "hidden",
    ...shadows.presets.lg,
  },
  posterGradient: {
    flex: 1,
    justifyContent: "space-between",
    padding: spacing.layout.modalPadding,
  },
  posterContent: {
    alignItems: "center",
    paddingTop: spacing.aliases.xl,
  },
  avatarCircle: {
    width: Spacing['3xl'],
    height: Spacing['3xl'],
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
    overflow: "hidden",
  },
  avatarImage: {
    width: Spacing['3xl'],
    height: Spacing['3xl'],
    borderRadius: 32,
  },
  avatarInitial: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.surface,
  },
  nickname: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.surface,
    marginTop: spacing.aliases.sm,
  },
  personalityLine: {
    fontSize: typography.fontSize.sm,
    color: "rgba(255,255,255,0.85)",
    marginTop: spacing.scale[1],
    textAlign: "center",
  },
  infoRow: {
    flexDirection: "row",
    gap: spacing.aliases.sm,
    marginTop: spacing.aliases.md,
  },
  infoChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: spacing.aliases.sm,
    paddingVertical: spacing.scale[1],
    borderRadius: spacing.borderRadius.full,
    gap: Spacing.xs,
  },
  infoChipText: {
    fontSize: typography.fontSize.xs,
    color: "rgba(255,255,255,0.9)",
    fontWeight: typography.fontWeight.medium,
  },
  tagsRow: {
    flexDirection: "row",
    gap: spacing.aliases.sm,
    marginTop: spacing.aliases.md,
  },
  posterTag: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: spacing.aliases.sm,
    paddingVertical: spacing.scale[1],
    borderRadius: spacing.borderRadius.lg,
  },
  posterTagText: {
    fontSize: typography.fontSize.xs,
    color: colors.surface,
    fontWeight: typography.fontWeight.medium,
  },
  watermark: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
    letterSpacing: typography.letterSpacing.wider,
  },
  generateButton: {
    marginTop: spacing.aliases.md,
    borderRadius: spacing.borderRadius.full,
    overflow: "hidden",
    ...shadows.presets.md,
  },
  generateButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.aliases.sm,
    paddingHorizontal: spacing.aliases.xl,
    gap: spacing.aliases.sm,
  },
  generateButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.surface,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  actionSheet: {
    backgroundColor: colors.neutral.white,
    borderTopLeftRadius: spacing.borderRadius["2xl"],
    borderTopRightRadius: spacing.borderRadius["2xl"],
    paddingBottom: 34,
    ...shadows.presets.xl,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.layout.modalPadding,
    paddingVertical: spacing.layout.listItemPadding,
    gap: spacing.aliases.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.neutral[200],
  },
  actionItemText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.neutral[700],
  },
  actionDivider: {
    height: Spacing.sm,
    backgroundColor: colors.neutral[100],
  },
  actionCancel: {
    paddingVertical: spacing.layout.listItemPadding,
    alignItems: "center",
  },
  actionCancelText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[400],
  },
}))

export default SharePosterPreview;
