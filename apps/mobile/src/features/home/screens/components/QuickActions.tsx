import { memo, type ComponentProps } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import { DesignTokens } from '../../../../design-system/theme/tokens/design-tokens';
import { useTheme, createStyles } from '../../../../shared/contexts/ThemeContext';
import { flatColors as colors } from '../../../../design-system/theme';


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
        gradient: [colors.primary, colors.primaryLight],
        onPress: onAiStylist,
        locked: false,
      },
      {
        key: "virtual-try-on",
        title: "虚拟试衣",
        description: "一键试穿效果",
        icon: "shirt-outline",
        gradient: ["colors.neutral[500]", "colors.secondary"], // custom color
        onPress: onVirtualTryOn,
        locked: false,
      },
      {
        key: "cart",
        title: "购物车",
        description: "查看购物车",
        icon: "cart-outline",
        gradient: ["colors.primary", colors.primaryLight], // custom color
        onPress: onCart,
        locked: false,
      },
      {
        key: "wardrobe",
        title: "我的衣橱",
        description: "管理你的衣橱",
        icon: "grid-outline",
        gradient: [colors.secondary, "colors.secondary"], // custom color
        onPress: onWardrobe,
        locked: false,
      },
      {
        key: "style-report",
        title: "风格报告",
        description: "专属风格分析",
        icon: "document-text-outline",
        gradient: [colors.neutral[500], "colors.textTertiary"], // custom color
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
                <Ionicons name={action.icon} size={22} color={colors.textInverse} />
              </LinearGradient>
              <Text style={styles.title}>{action.title}</Text>
              <Text style={styles.description}>{action.description}</Text>
            </View>
            {action.locked && (
              <View style={styles.lockBadge}>
                <Ionicons name="lock-closed" size={12} color={colors.textTertiary} />
              </View>
            )}
          </Pressable>
        ))}
      </View>
    );
  }
);

QuickActions.displayName = "QuickActions";

const useStyles = createStyles((colors) => ({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -6,
  },
  card: {
    width: "33.33%",
    paddingHorizontal: DesignTokens.spacing['1.5'],
    marginBottom: DesignTokens.spacing[3],
  },
  cardLocked: {
    opacity: 0.5,
  },
  cardContent: {
    backgroundColor: colors.surface,
    borderRadius: DesignTokens.borderRadius.xl,
    padding: DesignTokens.spacing[4],
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  iconContainer: {
    width: DesignTokens.spacing[11],
    height: DesignTokens.spacing[11],
    borderRadius: DesignTokens.borderRadius.full,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: DesignTokens.spacing[3],
  },
  title: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.textPrimary,
    marginBottom: DesignTokens.spacing['0.5'],
  },
  description: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textTertiary,
  },
  lockBadge: {
    position: "absolute",
    top: DesignTokens.spacing['2.5'],
    right: DesignTokens.spacing['3.5'],
  },
}))

export default QuickActions;


const styles = StyleSheet.create({
  grid: { flex: 1 },
  card: { flex: 1 },
  cardLocked: { flex: 1 },
  cardContent: { flex: 1 },
  iconContainer: { flex: 1 },
  title: { flex: 1 },
  description: { flex: 1 },
  lockBadge: { flex: 1 },
});
