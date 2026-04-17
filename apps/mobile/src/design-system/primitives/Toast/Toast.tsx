import React, { useEffect, useRef, useState, createContext, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Platform,
} from "react-native";

import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { theme, DesignTokens, Spacing } from '../../theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';
import { flatColors as colors } from '../../../design-system/theme';


const { width: _SCREEN_WIDTH } = Dimensions.get("window");

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
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({
children }: ToastProviderProps) {
  const { colors } = useTheme();
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const show = (type: ToastType, message: string, duration = 3000) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, message, duration }]);
  };

  const removeToast = (id: string) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

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

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 10,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -100,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onDismiss();
      });
    }, toast.duration || 3000);

    return () => clearTimeout(timer);
  }, []);

  const getIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (toast.type) {
      case "success":
        return "checkmark-circle";
      case "error":
        return "close-circle";
      case "warning":
        return "warning";
      case "info":
      default:
        return "information-circle";
    }
  };

  const getColor = () => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
    switch (toast.type) {
      case "success":
        return theme.colors.success;
      case "error":
        return theme.colors.error;
      case "warning":
        return theme.colors.warning;
      case "info":
      default:
        return theme.colors.info;
    }
  };

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          transform: [{ translateY }],
          opacity,
          borderLeftColor: getColor(),
        },
      ]}
    >
      <View style={styles.toastContent}>
        <Ionicons name={getIcon()} size={22} color={getColor()} />
        <Text style={styles.toastMessage}>{toast.message}</Text>
      </View>
      <TouchableOpacity onPress={onDismiss} hitSlop={{ top: DesignTokens.spacing['2.5'], bottom: DesignTokens.spacing['2.5'], left: DesignTokens.spacing['2.5'], right: DesignTokens.spacing['2.5']}}>
        <Ionicons name="close" size={18} color={theme.colors.neutral[400]} />
      </TouchableOpacity>
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
    paddingHorizontal: Spacing.md,
  },
  toast: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderLeftWidth: 4,
    marginBottom: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing['3.5'],
    ...Platform.select({
      ios: {
        shadowColor: colors.neutral[900],
        shadowOffset: { width: 0, height: Spacing.xs },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  toastContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  toastMessage: {
    fontSize: DesignTokens.typography.sizes.base,
    color: theme.colors.textPrimary,
    marginLeft: DesignTokens.spacing[3],
    flex: 1,
  },
}))
