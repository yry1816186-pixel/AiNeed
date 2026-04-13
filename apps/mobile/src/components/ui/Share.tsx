import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import Share, { ShareOptions } from "react-native-share";
import * as Haptics from '@/src/polyfills/expo-haptics';
import {
  Colors,
  Spacing,
  BorderRadius,
  Typography,
  Shadows,
} from "../../theme";

interface ShareButtonProps {
  title?: string;
  message?: string;
  url?: string;
  icon?: string;
  variant?: "default" | "compact" | "large";
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function ShareButton({
  title = "分享",
  message,
  url,
  icon = "📤",
  variant = "default",
  onSuccess,
  onError,
}: ShareButtonProps) {
  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const shareOptions: ShareOptions = {
      title: title,
      message: message || "",
      url: url,
    };

    try {
      const result = await Share.open(shareOptions);
      if (result.success) {
        onSuccess?.();
      }
    } catch (error) {
      if ((error as Error).message !== "User did not share") {
        onError?.(error as Error);
      }
    }
  };

  const sizes = {
    default: { paddingVertical: Spacing[3], paddingHorizontal: Spacing[4] },
    compact: { paddingVertical: Spacing[2], paddingHorizontal: Spacing[3] },
    large: { paddingVertical: Spacing[4], paddingHorizontal: Spacing[5] },
  };

  const textSizes = {
    default: Typography.body.md,
    compact: Typography.body.sm,
    large: Typography.body.lg,
  };

  return (
    <TouchableOpacity
      style={[styles.shareButton, sizes[variant]]}
      onPress={handleShare}
      activeOpacity={0.8}
    >
      <Text style={styles.shareIcon}>{icon}</Text>
      <Text style={[styles.shareText, textSizes[variant]]}>{title}</Text>
    </TouchableOpacity>
  );
}

interface ShareProductProps {
  product: {
    id: string;
    name: string;
    price: number;
    image?: string;
  };
  variant?: "button" | "icon";
}

export function ShareProduct({
  product,
  variant = "button",
}: ShareProductProps) {
  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const shareOptions: ShareOptions = {
      title: product.name,
      message: `${product.name}\n¥${product.price}\n\n发现了一个不错的商品，快来看看吧！`,
      url: product.image,
    };

    try {
      await Share.open(shareOptions);
    } catch (error) {
      if ((error as Error).message !== "User did not share") {
        console.error("Share error:", error);
      }
    }
  };

  if (variant === "icon") {
    return (
      <TouchableOpacity
        style={styles.iconButton}
        onPress={handleShare}
        activeOpacity={0.7}
      >
        <Text style={styles.iconEmoji}>📤</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.productShareButton} onPress={handleShare}>
      <Text style={styles.productShareIcon}>📤</Text>
      <Text style={styles.productShareText}>分享</Text>
    </TouchableOpacity>
  );
}

interface ShareOutfitProps {
  outfit: {
    id: string;
    title: string;
    items: { name: string; price: number }[];
  };
}

export function ShareOutfit({ outfit }: ShareOutfitProps) {
  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const itemsText = outfit.items
      .map((item) => `• ${item.name} - ¥${item.price}`)
      .join("\n");

    const shareOptions: ShareOptions = {
      title: outfit.title,
      message: `👗 ${outfit.title}\n\n${itemsText}\n\n来自寻裳智能穿搭推荐`,
    };

    try {
      await Share.open(shareOptions);
    } catch (error) {
      if ((error as Error).message !== "User did not share") {
        console.error("Share error:", error);
      }
    }
  };

  return (
    <TouchableOpacity style={styles.outfitShareButton} onPress={handleShare}>
      <Text style={styles.outfitShareIcon}>✨</Text>
      <Text style={styles.outfitShareText}>分享穿搭</Text>
    </TouchableOpacity>
  );
}

interface ShareToSocialProps {
  platform: "wechat" | "weibo" | "qq";
  title?: string;
  message?: string;
  image?: string;
  onSuccess?: () => void;
}

export function ShareToSocial({
  platform,
  title,
  message,
  image,
  onSuccess,
}: ShareToSocialProps) {
  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const socialOptions: ShareOptions = {
      title: title,
      message: message,
      url: image,
    };

    try {
      await Share.open(socialOptions);
      onSuccess?.();
    } catch (error) {
      if ((error as Error).message !== "User did not share") {
        Alert.alert("分享失败", "请确保已安装对应应用");
      }
    }
  };

  const platformConfig = {
    wechat: { name: "微信", icon: "💬", color: "#07C160" },
    weibo: { name: "微博", icon: "📢", color: "#E6162D" },
    qq: { name: "QQ", icon: "🐧", color: "#12B7F5" },
  };

  const config = platformConfig[platform];

  return (
    <TouchableOpacity
      style={[styles.socialButton, { backgroundColor: config.color }]}
      onPress={handleShare}
      activeOpacity={0.8}
    >
      <Text style={styles.socialIcon}>{config.icon}</Text>
      <Text style={styles.socialText}>{config.name}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.neutral[100],
    borderRadius: BorderRadius.lg,
    gap: Spacing[2],
  },
  shareIcon: {
    fontSize: 18,
  },
  shareText: {
    color: Colors.neutral[700],
    fontWeight: "600",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.sm,
  },
  iconEmoji: {
    fontSize: 18,
  },
  productShareButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    backgroundColor: Colors.neutral[100],
    borderRadius: BorderRadius.full,
    gap: Spacing[1],
  },
  productShareIcon: {
    fontSize: 14,
  },
  productShareText: {
    ...Typography.caption.md,
    color: Colors.neutral[600],
    fontWeight: "500",
  },
  outfitShareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[5],
    backgroundColor: Colors.neutral[0],
    borderRadius: BorderRadius.full,
    gap: Spacing[2],
    ...Shadows.md,
  },
  outfitShareIcon: {
    fontSize: 18,
  },
  outfitShareText: {
    ...Typography.body.md,
    color: Colors.neutral[700],
    fontWeight: "600",
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[5],
    borderRadius: BorderRadius.lg,
    gap: Spacing[2],
  },
  socialIcon: {
    fontSize: 20,
  },
  socialText: {
    ...Typography.body.md,
    color: Colors.neutral[0],
    fontWeight: "600",
  },
});
