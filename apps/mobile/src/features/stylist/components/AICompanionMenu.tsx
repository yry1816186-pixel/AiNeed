import React, { useEffect, useCallback } from "react";
import { View, Text, StyleSheet, Dimensions, Pressable, ScrollView } from "react-native";
import Svg, { Path } from "react-native-svg";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  interpolate,
  Extrapolate,
  runOnJS,
} from "react-native-reanimated";
import AnimatedReanimated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DesignTokens } from "../../theme/tokens/design-tokens";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const AnimatedView = AnimatedReanimated.createAnimatedComponent(View);
const AnimatedPressable = AnimatedReanimated.createAnimatedComponent(Pressable);

const ICON_SIZE = 24;

const Icons = {
  stylist: ({ color = DesignTokens.colors.text.inverse }) => (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2Z"
        fill={color}
      />
      <Path
        d="M21 12H16L14 8L12 12L10 8L8 12H3V14H9L12 20L15 14H21V12Z"
        fill={color}
        fillOpacity="0.7"
      />
      <Path
        d="M12 22C12.5523 22 13 21.5523 13 21C13 20.4477 12.5523 20 12 20C11.4477 20 11 20.4477 11 21C11 21.5523 11.4477 22 12 22Z"
        fill={color}
      />
    </Svg>
  ),
  photo: ({ color = DesignTokens.colors.text.inverse }) => (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8 10C8.55228 10 9 9.55228 9 9C9 8.44772 8.55228 8 8 8C7.44772 8 7 8.44772 7 9C7 9.55228 7.44772 10 8 10Z"
        fill={color}
      />
      <Path
        d="M22 15L17 10L7 20"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  ),
  recommend: ({ color = DesignTokens.colors.text.inverse }) => (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  ),
  wardrobe: ({ color = DesignTokens.colors.text.inverse }) => (
    <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
      <Path
        d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M12 3V21" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M9 10H10" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <Path d="M14 10H15" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </Svg>
  ),
};

export interface QuickAction {
  id: string;
  icon: string;
  label: string;
  description?: string;
  onPress: () => void;
  gradient?: [string, string];
}

interface ActionItemProps {
  action: QuickAction;
  index: number;
  visible: boolean;
  onPress: (action: QuickAction) => void;
}

const ActionItemComponent: React.FC<ActionItemProps> = ({ action, index, visible, onPress }) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    if (visible) {
      opacity.value = withDelay(100 + index * 50, withTiming(1, { duration: 200 }));
      scale.value = withDelay(100 + index * 50, withSpring(1, { damping: 12, stiffness: 200 }));
    } else {
      opacity.value = withTiming(0, { duration: 100 });
      scale.value = withTiming(0.8, { duration: 100 });
    }
  }, [visible]);

  const actionStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const renderIcon = () => {
    const iconColor = DesignTokens.colors.text.inverse;
    switch (action.id) {
      case "stylist":
        return <Icons.stylist color={iconColor} />;
      case "photo":
        return <Icons.photo color={iconColor} />;
      case "recommend":
        return <Icons.recommend color={iconColor} />;
      case "wardrobe":
        return <Icons.wardrobe color={iconColor} />;
      default:
        return <Text style={styles.actionIconText}>{action.icon}</Text>;
    }
  };

  return (
    <AnimatedView style={actionStyle}>
      <Pressable style={styles.actionItem} onPress={() => onPress(action)} accessibilityLabel={action.label} accessibilityRole="button">
        <LinearGradient
          colors={
            action.gradient || [
              DesignTokens.colors.brand.terracotta,
              DesignTokens.colors.brand.camel,
            ]
          }
          style={styles.actionIcon}
        >
          {renderIcon()}
        </LinearGradient>
        <View style={styles.actionContent}>
          <Text style={styles.actionLabel}>{action.label}</Text>
          {action.description && <Text style={styles.actionDescription}>{action.description}</Text>}
        </View>
        <Text style={styles.actionArrow}>→</Text>
      </Pressable>
    </AnimatedView>
  );
};

export interface AICompanionMenuProps {
  visible: boolean;
  position: { x: number; y: number };
  ballSize: number;
  onClose: () => void;
  actions?: QuickAction[];
}

const DEFAULT_ACTIONS: QuickAction[] = [
  {
    id: "stylist",
    icon: "stylist",
    label: "AI 造型师",
    description: "获取穿搭建议",
    gradient: [DesignTokens.colors.brand.terracotta, DesignTokens.colors.brand.camel],
    onPress: () => {},
  },
  {
    id: "photo",
    icon: "photo",
    label: "拍照分析",
    description: "分析身材和肤色",
    gradient: [DesignTokens.colors.brand.slate, "#96A6B5"], // custom color
    onPress: () => {},
  },
  {
    id: "recommend",
    icon: "recommend",
    label: "智能推荐",
    description: "个性化推荐",
    gradient: [DesignTokens.colors.semantic.success, "#7BA896"], // custom color
    onPress: () => {},
  },
  {
    id: "wardrobe",
    icon: "wardrobe",
    label: "我的衣橱",
    description: "管理你的衣物",
    gradient: [DesignTokens.colors.semantic.warning, "#E8B86D"], // custom color
    onPress: () => {},
  },
];

export const AICompanionMenu: React.FC<AICompanionMenuProps> = ({
  visible,
  position,
  ballSize,
  onClose,
  actions = DEFAULT_ACTIONS,
}) => {
  const insets = useSafeAreaInsets();

  const backdropOpacity = useSharedValue(0);
  const menuScale = useSharedValue(0);
  const menuOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      backdropOpacity.value = withTiming(0.3, { duration: 200 });
      menuOpacity.value = withTiming(1, { duration: 200 });
      menuScale.value = withSpring(1, { damping: 15, stiffness: 150 });
    } else {
      backdropOpacity.value = withTiming(0, { duration: 150 });
      menuOpacity.value = withTiming(0, { duration: 150 });
      menuScale.value = withTiming(0.8, { duration: 150 });
    }
  }, [visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const menuStyle = useAnimatedStyle(() => ({
    opacity: menuOpacity.value,
    transform: [{ scale: menuScale.value }],
  }));

  const handleActionPress = useCallback(
    (action: QuickAction) => {
      onClose();
      action.onPress();
    },
    [onClose]
  );

  if (!visible) {
    return null;
  }

  const isLeftSide = position.x < SCREEN_WIDTH / 2;
  const menuWidth = SCREEN_WIDTH - 40;
  const menuHeight = Math.min(400, actions.length * 80 + 60);

  let menuTop = position.y - menuHeight / 2;
  menuTop = Math.max(
    insets.top + 20,
    Math.min(SCREEN_HEIGHT - insets.bottom - menuHeight - 100, menuTop)
  );

  const menuLeft = isLeftSide ? position.x + ballSize + 16 : position.x - menuWidth - 16;

  return (
    <>
      <AnimatedPressable style={[styles.backdrop, backdropStyle]} onPress={onClose} accessibilityLabel="关闭菜单" accessibilityRole="button" />

      <AnimatedView
        style={[
          styles.menuContainer,
          {
            top: menuTop,
            left: menuLeft,
            width: menuWidth,
          },
          menuStyle,
        ]}
      >
        <LinearGradient colors={[DesignTokens.colors.backgrounds.primary, DesignTokens.colors.backgrounds.secondary]} style={styles.menuGradient}>
          <View style={styles.menuHeader}>
            <Text style={styles.menuTitle}>AI 助手</Text>
            <Text style={styles.menuSubtitle}>选择你需要的服务</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.actionsList}>
            {actions.map((action, index) => (
              <ActionItemComponent
                key={action.id}
                action={action}
                index={index}
                visible={visible}
                onPress={handleActionPress}
              />
            ))}
          </ScrollView>

          <View style={styles.menuFooter}>
            <Pressable style={styles.closeButton} onPress={onClose} accessibilityLabel="关闭" accessibilityRole="button">
              <Text style={styles.closeButtonText}>关闭</Text>
            </Pressable>
          </View>
        </LinearGradient>
      </AnimatedView>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: DesignTokens.colors.neutral.black,
    zIndex: 9998,
  },
  menuContainer: {
    position: "absolute",
    borderRadius: 20,
    shadowColor: DesignTokens.colors.neutral.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 30,
    elevation: 10,
    zIndex: 9999,
    overflow: "hidden",
  },
  menuGradient: {
    flex: 1,
    padding: 16,
  },
  menuHeader: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: DesignTokens.colors.neutral[200],
  },
  menuTitle: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "700",
    color: DesignTokens.colors.neutral[900],
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: DesignTokens.typography.sizes.base,
    color: DesignTokens.colors.neutral[500],
  },
  actionsList: {
    flex: 1,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: DesignTokens.colors.neutral[50],
    marginBottom: 8,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionIconText: {
    fontSize: DesignTokens.typography.sizes['2xl'],
  },
  actionContent: {
    flex: 1,
    marginLeft: 12,
  },
  actionLabel: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: DesignTokens.colors.neutral[900],
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: DesignTokens.colors.neutral[500],
  },
  actionArrow: {
    fontSize: DesignTokens.typography.sizes.lg,
    color: DesignTokens.colors.neutral[400],
    marginLeft: 8,
  },
  menuFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: DesignTokens.colors.neutral[200],
  },
  closeButton: {
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: DesignTokens.colors.neutral[100],
  },
  closeButtonText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: DesignTokens.colors.neutral[600],
  },
});
