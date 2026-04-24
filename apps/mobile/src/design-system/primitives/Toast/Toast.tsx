/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unused-vars */
import React, { useEffect, useCallback, useState, createContext, useContext } from "react";
import { View, Text, StyleSheet, Pressable, Platform, Dimensions } from "react-native";
import { BlurView } from "expo-blur";
import { CheckCircle, Warning, Info, X } from "phosphor-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  runOnJS,
} from "react-native-reanimated";
import { DesignTokens } from "../../theme/tokens/design-tokens";
import { SpringConfigs } from "../../theme/tokens/animations";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TOAST_DURATION = 3000;

type ToastType = "success" | "error" | "warning" | "info";

interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  show: (type: ToastType, message: string, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const show = useCallback((type: ToastType, message: string, duration = TOAST_DURATION) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
    setToasts((prev) => [...prev.slice(-4), { id, type, message, duration }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value: ToastContextValue = {
    show,
    success: (message, duration) => show("success", message, duration),
    error: (message, duration) => show("error", message, duration),
    warning: (message, duration) => show("warning", message, duration),
    info: (message, duration) => show("info", message, duration),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View style={styles.container} pointerEvents="box-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: () => void;
}

const TYPE_ICONS = {
  success: CheckCircle,
  error: Warning,
  warning: Warning,
  info: Info,
} as const;

function getTypeColor(type: ToastType, colors: Record<string, any>): string {
  switch (type) {
    case "success":
      return DesignTokens.colors.semantic.success;
    case "error":
      return DesignTokens.colors.semantic.error;
    case "warning":
      return DesignTokens.colors.semantic.warning;
    default:
      return DesignTokens.colors.brand.terracotta;
  }
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.85);

  const handleDismiss = useCallback(() => {
    "worklet";
    runOnJS(onDismiss)();
  }, [onDismiss]);

  useEffect(() => {
    translateY.value = withSpring(0, SpringConfigs.bouncy);
    opacity.value = withSpring(1, SpringConfigs.snappy);
    scale.value = withSpring(1, SpringConfigs.bouncy);

    const duration = toast.duration || TOAST_DURATION;
    translateY.value = withDelay(
      duration,
      withTiming(-100, { duration: 300 }, (finished) => {
        if (finished) {
          handleDismiss();
        }
      })
    );
    opacity.value = withDelay(duration, withTiming(0, { duration: 300 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  const Icon = TYPE_ICONS[toast.type];
  const accentColor = getTypeColor(toast.type, colors);

  return (
    <Animated.View style={[styles.toast, animatedStyle]}>
      <BlurView intensity={Platform.OS === "ios" ? 60 : 40} tint="light" style={styles.blur}>
        <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
        <Icon size={20} weight="fill" color={accentColor} />
        <Text style={styles.message} numberOfLines={2}>
          {toast.message}
        </Text>
        <Pressable onPress={onDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <X size={16} color={DesignTokens.colors.neutral[400]} />
        </Pressable>
      </BlurView>
    </Animated.View>
  );
}

const useStyles = createStyles((colors) => ({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingTop: Platform.OS === "ios" ? 60 : 40,
    paddingHorizontal: DesignTokens.spacing[4],
  },
  toast: {
    marginBottom: DesignTokens.spacing[2],
    borderRadius: DesignTokens.borderRadius.xl,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: DesignTokens.colors.neutral.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  blur: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: DesignTokens.spacing[4],
    paddingVertical: DesignTokens.spacing[3],
    gap: DesignTokens.spacing[3],
  },
  accentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderRadius: 4,
  },
  message: {
    flex: 1,
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "500" as any,
    color: colors.textPrimary,
    lineHeight: 20,
  },
}));
