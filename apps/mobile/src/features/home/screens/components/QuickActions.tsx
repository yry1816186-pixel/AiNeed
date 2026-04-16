import { memo, type ComponentProps } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import { DesignTokens } from "../../../theme/tokens/design-tokens";

interface QuickActionsProps {
  onAiStylist: () => void;
  onVirtualTryOn: () => void;
  onWardrobe: () => void;
  onStyleReport: () => void;
  onCart: () => void;
  isStyleReportUnlocked: boolean;
}

interface ActionItem {
  key: string;
  title: string;
  description: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  gradient: [string, string];
  onPress: () => void;
  locked: boolean;
}

const QuickActions = memo(
  ({
    onAiStylist,
    onVirtualTryOn,
    onWardrobe,
    onStyleReport,
    onCart,
    isStyleReportUnlocked,
  }: QuickActionsProps) => {
    const actions: ActionItem[] = [
      {
        key: "ai-stylist",
        title: "AI 造型师",
        description: "智能穿搭建议",
        icon: "sparkles",
        gradient: [DesignTokens.colors.brand.terracotta, DesignTokens.colors.brand.terracottaLight],
        onPress: onAiStylist,
        locked: false,
      },
      {
        key: "virtual-try-on",
        title: "虚拟试衣",
        description: "一键试穿效果",
        icon: "shirt-outline",
        gradient: ["#6EC1E4", "#5BCEA6"], // custom color
        onPress: onVirtualTryOn,
        locked: false,
      },
      {
        key: "cart",
        title: "购物车",
        description: "查看购物车",
        icon: "cart-outline",
        gradient: ["#E8A87C", DesignTokens.colors.brand.terracottaLight], // custom color
        onPress: onCart,
        locked: false,
      },
      {
        key: "wardrobe",
        title: "我的衣橱",
        description: "管理你的衣橱",
        icon: "grid-outline",
        gradient: [DesignTokens.colors.brand.sage, "#A3B096"], // custom color
        onPress: onWardrobe,
        locked: false,
      },
      {
        key: "style-report",
        title: "风格报告",
        description: "专属风格分析",
        icon: "document-text-outline",
        gradient: [DesignTokens.colors.brand.slate, "#96A6B5"], // custom color
        onPress: onStyleReport,
        locked: !isStyleReportUnlocked,
      },
    ];

    return (
      <View style={styles.grid}>
        {actions.map((action) => (
          <Pressable
            key={action.key}
            style={[styles.card, action.locked && styles.cardLocked]}
            onPress={action.onPress}
            android_ripple={{
              color: "rgba(0, 0, 0, 0.06)",
              borderless: false,
            }}
            accessibilityLabel={action.title}
            accessibilityRole="button"
            accessibilityState={{ disabled: action.locked }}
          >
            <View style={styles.cardContent}>
              <LinearGradient
                colors={action.gradient}
                style={styles.iconContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name={action.icon} size={22} color={DesignTokens.colors.text.inverse} />
              </LinearGradient>
              <Text style={styles.title}>{action.title}</Text>
              <Text style={styles.description}>{action.description}</Text>
            </View>
            {action.locked && (
              <View style={styles.lockBadge}>
                <Ionicons name="lock-closed" size={12} color={DesignTokens.colors.text.tertiary} />
              </View>
            )}
          </Pressable>
        ))}
      </View>
    );
  }
);

QuickActions.displayName = "QuickActions";

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
  },
  card: {
    width: "33.33%",
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  cardLocked: {
    opacity: 0.5,
  },
  cardContent: {
    backgroundColor: DesignTokens.colors.backgrounds.primary,
    borderRadius: DesignTokens.borderRadius.xl,
    padding: DesignTokens.spacing[4],
    borderWidth: 1,
    borderColor: DesignTokens.colors.borders.light,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: DesignTokens.borderRadius.full,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: DesignTokens.spacing[3],
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: DesignTokens.colors.text.primary,
    marginBottom: 2,
  },
  description: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: DesignTokens.colors.text.tertiary,
  },
  lockBadge: {
    position: "absolute",
    top: 10,
    right: 14,
  },
});

export default QuickActions;
