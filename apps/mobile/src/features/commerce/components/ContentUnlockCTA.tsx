import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { Ionicons } from "../../../polyfills/expo-vector-icons";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";

interface ContentUnlockCTAProps {
  productType: string;
  price: number;
  onUnlock: () => void;
}

/**
 * ContentUnlockCTA -- "解锁完整报告" call-to-action component.
 *
 * D-07: Shows price badge + unlock button for unpurchased content products.
 * Used in ContentProductScreen for unpurchased product cards.
 */
export const ContentUnlockCTA: React.FC<ContentUnlockCTAProps> = ({
  productType,
  price,
  onUnlock,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.previewOverlay}>
        <Ionicons name="lock-closed-outline" size={32} color={DesignTokens.colors.neutral[300]} />
        <Text style={styles.previewHint}>预览模式</Text>
      </View>
      <View style={styles.ctaSection}>
        <Text style={styles.title}>解锁完整报告</Text>
        <Text style={styles.description}>购买后永久访问你的专属分析报告</Text>
        <TouchableOpacity style={styles.unlockButton} onPress={onUnlock} activeOpacity={0.8}>
          <Ionicons name="lock-open-outline" size={16} color={DesignTokens.colors.neutral.white} />
          <Text style={styles.unlockText}>解锁完整报告 ¥{price}</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>购买后永久访问</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: DesignTokens.colors.neutral[50],
    borderRadius: DesignTokens.borderRadius.xl,
    overflow: "hidden",
  } as ViewStyle,
  previewOverlay: {
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${DesignTokens.colors.brand.camel}08`,
    gap: DesignTokens.spacing[2],
  } as ViewStyle,
  previewHint: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: DesignTokens.colors.neutral[400],
  },
  ctaSection: {
    padding: DesignTokens.spacing[4],
    alignItems: "center",
  } as ViewStyle,
  title: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "700" as TextStyle["fontWeight"],
    color: DesignTokens.colors.neutral[900],
    marginBottom: DesignTokens.spacing[1],
  },
  description: {
    fontSize: DesignTokens.typography.sizes.base,
    color: DesignTokens.colors.neutral[500],
    textAlign: "center",
    marginBottom: DesignTokens.spacing[4],
    lineHeight: 20,
  },
  unlockButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: DesignTokens.spacing[2],
    height: 48,
    paddingHorizontal: DesignTokens.spacing[6],
    borderRadius: DesignTokens.borderRadius.xl,
    backgroundColor: DesignTokens.colors.brand.camel,
    ...DesignTokens.shadows.brand,
  } as ViewStyle,
  unlockText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "700" as TextStyle["fontWeight"],
    color: DesignTokens.colors.neutral.white,
  },
  hint: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: DesignTokens.colors.neutral[400],
    marginTop: DesignTokens.spacing[2],
  },
});
