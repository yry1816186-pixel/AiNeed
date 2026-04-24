import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
  Image,
  Modal,
  ViewStyle,
} from "react-native";

import * as Haptics from "@/src/polyfills/expo-haptics";

import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import AnimatedReanimated from "react-native-reanimated";

import { DesignTokens } from "../../../../design-system/theme/tokens/design-tokens";

import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { flatColors as colors } from "../../../../design-system/theme";
import { createStyles } from "../../../../shared/contexts/ThemeContext";

const AnimatedView = AnimatedReanimated.createAnimatedComponent(View);
const AnimatedTouchableOpacity = AnimatedReanimated.createAnimatedComponent(TouchableOpacity);

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

import { Dimensions } from "react-native";

const springConfig = {
  damping: 15,
  stiffness: 200,
  mass: 0.5,
};

export interface ShareSheetProps {
  visible: boolean;
  onClose: () => void;
  onShare?: (platform: string) => void;
  onSave?: () => void;
  onCopyLink?: () => void;
  product?: {
    name: string;
    image: string;
    price: number;
  };
}

interface SharePlatform {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface SharePlatformItemProps {
  platform: SharePlatform;
  index: number;
  onPress: (platformId: string) => void;
}

const SharePlatformItem: React.FC<SharePlatformItemProps> = ({ platform, index, onPress }) => {
  const styles = useStyles(colors);
  const platformScale = useSharedValue(0);

  useEffect(() => {
    platformScale.value = withDelay(300 + index * 50, withSpring(1, springConfig));
  }, [index, platformScale]);

  const platformAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: platformScale.value }],
  }));

  return (
    <AnimatedTouchableOpacity
      style={[styles.platformItem, platformAnimatedStyle]}
      onPress={() => onPress(platform.id)}
      activeOpacity={0.8}
    >
      <View style={[styles.platformIcon, { backgroundColor: `${platform.color}20` }]}>
        <Ionicons name={platform.icon} size={24} color={platform.color} />
      </View>
      <Text style={styles.platformName}>{platform.name}</Text>
    </AnimatedTouchableOpacity>
  );
};

export const ShareSheet: React.FC<ShareSheetProps> = ({
  visible,
  onClose,
  onShare,
  onSave,
  onCopyLink,
  product,
}) => {
  const styles = useStyles(colors);
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const itemOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 200 });
      backdropOpacity.value = withTiming(0.5, { duration: 300 });
      itemOpacity.value = withDelay(200, withTiming(1, { duration: 300 }));
    } else {
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 250 });
      backdropOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const itemAnimatedStyle = useAnimatedStyle(() => ({
    opacity: itemOpacity.value,
  }));

  const platforms = [
    {
      id: "wechat",
      name: "微信",
      icon: "chatbubble-ellipses",
      color: "colors.success",
    },
    { id: "moments", name: "朋友圈", icon: "camera-outline", color: "colors.success" },
    { id: "weibo", name: "微博", icon: "logo-twitter", color: "colors.error" },
    { id: "qq", name: "QQ", icon: "chatbubbles", color: "colors.info" },
    {
      id: "link",
      name: "复制链接",
      icon: "link-outline",
      color: colors.neutral[500],
    },
  ];

  const handlePlatformPress = (platformId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onShare?.(platformId);
  };

  return (
    <Modal visible={visible} transparent onRequestClose={onClose}>
      <AnimatedView style={[StyleSheet.absoluteFill, backdropAnimatedStyle]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableOpacity>
      </AnimatedView>

      <AnimatedView style={[styles.sheet, sheetAnimatedStyle]}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>分享</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color={colors.neutral[500]} />
          </TouchableOpacity>
        </View>

        {product && (
          <AnimatedView style={[styles.productPreview, itemAnimatedStyle]}>
            <Image source={{ uri: product.image }} style={styles.productImage} />
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={1}>
                {product.name}
              </Text>
              <Text style={styles.productPrice}>¥{product.price}</Text>
            </View>
          </AnimatedView>
        )}

        <View style={styles.platformsContainer}>
          {platforms.map((platform, index) => (
            <SharePlatformItem
              key={platform.id}
              platform={platform}
              index={index}
              onPress={handlePlatformPress}
            />
          ))}
        </View>

        <View style={styles.actionsContainer}>
          {onSave && (
            <TouchableOpacity style={styles.actionButton} onPress={onSave}>
              <Ionicons name="bookmark-outline" size={20} color={colors.neutral[600]} />
              <Text style={styles.actionText}>保存到衣橱</Text>
            </TouchableOpacity>
          )}
          {onCopyLink && (
            <TouchableOpacity style={styles.actionButton} onPress={onCopyLink}>
              <Ionicons name="link-outline" size={20} color={colors.neutral[600]} />
              <Text style={styles.actionText}>复制链接</Text>
            </TouchableOpacity>
          )}
        </View>
      </AnimatedView>
    </Modal>
  );
};

const useStyles = createStyles((colors) => ({
  backdrop: {
    flex: 1,
    backgroundColor: "transparent",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  sheetTitle: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "600",
    color: colors.neutral[800],
  },
  closeButton: {
    padding: 4,
  },
  productPreview: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
  },
  productName: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.neutral[800],
  },
  productPrice: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.primary[500],
    marginTop: 4,
  },
  platformsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 20,
  },
  platformItem: {
    alignItems: "center",
    paddingHorizontal: 16,
  },
  platformIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  platformName: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.neutral[600],
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[100],
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 8,
  },
  actionText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.neutral[600],
    marginLeft: 8,
  },
}));
