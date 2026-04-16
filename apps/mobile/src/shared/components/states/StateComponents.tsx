import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
  TouchableOpacity,
  Image,
  ViewStyle,
  TextStyle,
  Animated,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";
import * as Haptics from "@/src/polyfills/expo-haptics";
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  interpolate,
  Extrapolate,
  Easing,
  runOnJS,
} from "react-native-reanimated";
import AnimatedReanimated from "react-native-reanimated";
import { Colors , Spacing } from '../../../design-system/theme'
import { DesignTokens } from "../../../theme/tokens/design-tokens";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { useTheme, createStyles } from '../../contexts/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const AnimatedView = AnimatedReanimated.createAnimatedComponent(View);
const _AnimatedText = AnimatedReanimated.createAnimatedComponent(Text);

const springConfig = {
  damping: 15,
  stiffness: 150,
  mass: 0.5,
};

const confettiColors = [colors.neutral[300], colors.neutral[700], colors.warning, colors.success, colors.error, colors.primary]; // custom color

export interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap | "custom";
  customIcon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  illustration?:
    | "empty-box"
    | "search"
    | "error"
    | "no-internet"
    | "no-notification"
    | "no-favorite"
    | "no-order"
    | "no-cart";
  style?: ViewStyle;
  animated?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  customIcon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  illustration,
  style,
  animated = true,
}) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);
  const floatY = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(1, springConfig);
    opacity.value = withTiming(1, { duration: 400 });

    if (animated) {
      floatY.value = withRepeat(
        withSequence(
          withTiming(-10, {
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );

      rotation.value = withRepeat(
        withSequence(
          withTiming(5, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(-5, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }
  }, [animated]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const floatAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }, { rotateZ: `${rotation.value}deg` }],
  }));

  const getIllustrationIcon = () => {
    switch (illustration) {
      case "empty-box":
        return { icon: "cube-outline", color: Colors.neutral[400] };
      case "search":
        return { icon: "search-outline", color: Colors.primary[400] };
      case "error":
        return { icon: "alert-circle-outline", color: Colors.error[400] };
      case "no-internet":
        return { icon: "cloud-offline-outline", color: Colors.warning[400] };
      case "no-notification":
        return {
          icon: "notifications-off-outline",
          color: Colors.neutral[400],
        };
      case "no-favorite":
        return { icon: "heart-outline", color: Colors.error[300] };
      case "no-order":
        return { icon: "receipt-outline", color: Colors.neutral[400] };
      case "no-cart":
        return { icon: "cart-outline", color: Colors.neutral[400] };
      default:
        return {
          icon: icon || "help-circle-outline",
          color: Colors.neutral[400],
        };
    }
  };

  const iconConfig = getIllustrationIcon();

  return (
    <AnimatedView style={[styles.emptyContainer, containerAnimatedStyle, style]}>
      <AnimatedView style={[styles.emptyIconContainer, floatAnimatedStyle]}>
        {customIcon ? (
          customIcon
        ) : (
          <View style={[styles.emptyIconCircle, { backgroundColor: `${iconConfig.color}20` }]}>
            <Ionicons name={iconConfig.icon} size={56} color={iconConfig.color} />
          </View>
        )}
      </AnimatedView>

      <Text style={styles.emptyTitle}>{title}</Text>
      {description && <Text style={styles.emptyDescription}>{description}</Text>}

      {actionLabel && onAction && (
        <TouchableOpacity style={styles.emptyAction} onPress={onAction}>
          <LinearGradient colors={[colors.neutral[300], colors.neutral[700]]} style={styles.emptyActionGradient}>
            <Text style={styles.emptyActionText}>{actionLabel}</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {secondaryActionLabel && onSecondaryAction && (
        <TouchableOpacity style={styles.emptySecondaryAction} onPress={onSecondaryAction}>
          <Text style={styles.emptySecondaryText}>{secondaryActionLabel}</Text>
        </TouchableOpacity>
      )}
    </AnimatedView>
  );
};

export interface ErrorStateProps {
  title?: string;
  message?: string;
  errorCode?: string;
  onRetry?: () => void;
  onReport?: () => void;
  showIllustration?: boolean;
  style?: ViewStyle;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "出错了",
  message = "抱歉，发生了一些错误，请稍后重试",
  errorCode,
  onRetry,
  onReport,
  showIllustration = true,
  style,
}) => {
  const shakeX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.9);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
    scale.value = withSpring(1, springConfig);

    shakeX.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
  }, []);

  const shakeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedView style={[styles.errorContainer, containerAnimatedStyle, style]}>
      {showIllustration && (
        <AnimatedView style={[styles.errorIllustration, shakeAnimatedStyle]}>
          <View style={styles.errorIconContainer}>
            <Ionicons name="warning" size={64} color={Colors.error[500]} />
          </View>
          <View style={styles.errorDecorations}>
            <View style={[styles.errorDot, styles.errorDot1]} />
            <View style={[styles.errorDot, styles.errorDot2]} />
            <View style={[styles.errorDot, styles.errorDot3]} />
          </View>
        </AnimatedView>
      )}

      <Text style={styles.errorTitle}>{title}</Text>
      <Text style={styles.errorMessage}>{message}</Text>

      {errorCode && (
        <View style={styles.errorCodeContainer}>
          <Text style={styles.errorCodeLabel}>错误代码</Text>
          <Text style={styles.errorCodeValue}>{errorCode}</Text>
        </View>
      )}

      <View style={styles.errorActions}>
        {onRetry && (
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Ionicons name="refresh" size={18} color={colors.textInverse} />
            <Text style={styles.retryText}>重试</Text>
          </TouchableOpacity>
        )}
        {onReport && (
          <TouchableOpacity style={styles.reportButton} onPress={onReport}>
            <Ionicons name="chatbubble-outline" size={18} color={Colors.neutral[600]} />
            <Text style={styles.reportText}>反馈问题</Text>
          </TouchableOpacity>
        )}
      </View>
    </AnimatedView>
  );
};

export interface NetworkErrorProps {
  onRetry?: () => void;
  onSettings?: () => void;
  style?: ViewStyle;
}

export const NetworkError: React.FC<NetworkErrorProps> = ({ onRetry, onSettings, style }) => {
  const pulseScale = useSharedValue(1);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    pulseScale.value = withRepeat(
      withSequence(withTiming(1.1, { duration: 800 }), withTiming(1, { duration: 800 })),
      -1,
      true
    );
  }, []);

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <AnimatedView style={[styles.networkContainer, containerAnimatedStyle, style]}>
      <AnimatedView style={[styles.networkIconContainer, pulseAnimatedStyle]}>
        <View style={styles.networkIconBg}>
          <Ionicons name="cloud-offline" size={56} color={Colors.neutral[400]} />
        </View>
        <View style={styles.networkWaves}>
          <View style={[styles.networkWave, styles.networkWave1]} />
          <View style={[styles.networkWave, styles.networkWave2]} />
          <View style={[styles.networkWave, styles.networkWave3]} />
        </View>
      </AnimatedView>

      <Text style={styles.networkTitle}>网络连接失败</Text>
      <Text style={styles.networkMessage}>请检查您的网络连接后重试</Text>

      <View style={styles.networkActions}>
        {onRetry && (
          <TouchableOpacity style={styles.networkRetryButton} onPress={onRetry}>
            <LinearGradient colors={[colors.neutral[300], colors.neutral[700]]} style={styles.networkRetryGradient}>
              <Ionicons name="refresh" size={18} color={colors.textInverse} />
              <Text style={styles.networkRetryText}>重试</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
        {onSettings && (
          <TouchableOpacity style={styles.networkSettingsButton} onPress={onSettings}>
            <Ionicons name="settings-outline" size={18} color={Colors.neutral[600]} />
            <Text style={styles.networkSettingsText}>网络设置</Text>
          </TouchableOpacity>
        )}
      </View>
    </AnimatedView>
  );
};

export interface MaintenanceScreenProps {
  estimatedTime?: string;
  message?: string;
  style?: ViewStyle;
}

export const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({
  estimatedTime,
  message = "我们正在进行系统维护，请稍后再试",
  style,
}) => {
  const rotation = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 500 });
    rotation.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const gearAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${rotation.value}deg` }],
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <AnimatedView style={[styles.maintenanceContainer, containerAnimatedStyle, style]}>
      <View style={styles.maintenanceIconContainer}>
        <AnimatedView style={gearAnimatedStyle}>
          <Ionicons name="settings" size={64} color={Colors.primary[500]} />
        </AnimatedView>
        <View style={styles.maintenanceTools}>
          <Ionicons name="construct" size={28} color={Colors.warning[500]} />
        </View>
      </View>

      <Text style={styles.maintenanceTitle}>系统维护中</Text>
      <Text style={styles.maintenanceMessage}>{message}</Text>

      {estimatedTime && (
        <View style={styles.estimatedTimeContainer}>
          <Ionicons name="time-outline" size={18} color={Colors.neutral[500]} />
          <Text style={styles.estimatedTimeText}>预计恢复时间：{estimatedTime}</Text>
        </View>
      )}

      <View style={styles.maintenanceTips}>
        <Text style={styles.maintenanceTipsTitle}>您可以：</Text>
        <Text style={styles.maintenanceTip}>• 稍后刷新页面重试</Text>
        <Text style={styles.maintenanceTip}>• 关注我们的社交媒体获取最新动态</Text>
      </View>
    </AnimatedView>
  );
};

export interface PermissionDeniedProps {
  permission: "camera" | "gallery" | "location" | "notification";
  onOpenSettings?: () => void;
  style?: ViewStyle;
}

export const PermissionDenied: React.FC<PermissionDeniedProps> = ({
  permission,
  onOpenSettings,
  style,
}) => {
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
    scale.value = withSpring(1, springConfig);
  }, []);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const permissionConfig = {
    camera: {
      icon: "camera-outline",
      title: "需要相机权限",
      message: "请在设置中允许访问相机，以便您可以使用拍照功能",
    },
    gallery: {
      icon: "images-outline",
      title: "需要相册权限",
      message: "请在设置中允许访问相册，以便您可以选择和保存照片",
    },
    location: {
      icon: "location-outline",
      title: "需要位置权限",
      message: "请在设置中允许访问位置，以便我们可以为您推荐附近的门店",
    },
    notification: {
      icon: "notifications-outline",
      title: "需要通知权限",
      message: "请在设置中允许发送通知，以便您不会错过重要消息",
    },
  };

  const config = permissionConfig[permission];

  return (
    <AnimatedView style={[styles.permissionContainer, containerAnimatedStyle, style]}>
      <View style={styles.permissionIconContainer}>
        <Ionicons name={config.icon} size={56} color={Colors.primary[500]} />
        <View style={styles.permissionLock}>
          <Ionicons name="lock-closed" size={20} color={Colors.error[500]} />
        </View>
      </View>

      <Text style={styles.permissionTitle}>{config.title}</Text>
      <Text style={styles.permissionMessage}>{config.message}</Text>

      {onOpenSettings && (
        <TouchableOpacity style={styles.permissionButton} onPress={onOpenSettings}>
          <LinearGradient colors={[colors.neutral[300], colors.neutral[700]]} style={styles.permissionButtonGradient}>
            <Ionicons name="settings-outline" size={18} color={colors.textInverse} />
            <Text style={styles.permissionButtonText}>打开设置</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </AnimatedView>
  );
};

export interface SuccessStateProps {
  title: string;
  message?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
  confetti?: boolean;
  style?: ViewStyle;
}

interface ConfettiPieceProps {
  index: number;
}

const ConfettiPiece: React.FC<ConfettiPieceProps> = ({ index }) => {
  const initialX = useRef(Math.random() * SCREEN_WIDTH).current;
  const drift1 = useRef((Math.random() - 0.5) * 100).current;
  const drift2 = useRef((Math.random() - 0.5) * 100).current;
  const drift3 = useRef((Math.random() - 0.5) * 100).current;
  const fallDuration = useRef(2000 + Math.random() * 1000).current;
  const rotationDuration = useRef(1000 + Math.random() * 500).current;

  const confettiY = useSharedValue(-20);
  const confettiX = useSharedValue(initialX);
  const confettiRotation = useSharedValue(0);
  const confettiOpacity = useSharedValue(1);

  useEffect(() => {
    confettiY.value = withTiming(SCREEN_HEIGHT + 50, {
      duration: fallDuration,
      easing: Easing.out(Easing.quad),
    });
    confettiX.value = withSequence(
      withTiming(initialX + drift1, { duration: 500 }),
      withTiming(initialX + drift2, { duration: 500 }),
      withTiming(initialX + drift3, { duration: 500 })
    );
    confettiRotation.value = withRepeat(withTiming(360, { duration: rotationDuration }), -1, false);
    confettiOpacity.value = withDelay(1500, withTiming(0, { duration: 500 }));
  }, [
    confettiOpacity,
    confettiRotation,
    confettiX,
    confettiY,
    drift1,
    drift2,
    drift3,
    fallDuration,
    initialX,
    rotationDuration,
  ]);

  const confettiAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: confettiY.value },
      { translateX: confettiX.value },
      { rotateZ: `${confettiRotation.value}deg` },
    ],
    opacity: confettiOpacity.value,
  }));

  return (
    <AnimatedView
      style={[
        styles.confetti,
        { backgroundColor: confettiColors[index % confettiColors.length] },
        confettiAnimatedStyle,
      ]}
    />
  );
};

export const SuccessState: React.FC<SuccessStateProps> = ({
  title,
  message,
  icon = "checkmark-circle",
  actionLabel,
  onAction,
  confetti = false,
  style,
}) => {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const checkScale = useSharedValue(0);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
    scale.value = withSpring(1, springConfig);

    setTimeout(() => {
      checkScale.value = withSpring(1, { damping: 8, stiffness: 200 });
      if (confetti) {
        runOnJS(setShowConfetti)(true);
        runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Success);
      }
    }, 200);
  }, [confetti]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  return (
    <AnimatedView style={[styles.successContainer, containerAnimatedStyle, style]}>
      <AnimatedView style={[styles.successIconContainer, checkAnimatedStyle]}>
        <LinearGradient colors={[colors.success, "#059669"]} style={styles.successIconGradient}>
          <Ionicons name={icon} size={48} color={colors.textInverse} />
        </LinearGradient>
      </AnimatedView>

      <Text style={styles.successTitle}>{title}</Text>
      {message && <Text style={styles.successMessage}>{message}</Text>}

      {actionLabel && onAction && (
        <TouchableOpacity style={styles.successAction} onPress={onAction}>
          <Text style={styles.successActionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}

      {showConfetti && (
        <View style={styles.confettiContainer} pointerEvents="none">
          {Array(20)
            .fill(0)
            .map((_, i) => (
              <ConfettiPiece key={i} index={i} />
            ))}
        </View>
      )}
    </AnimatedView>
  );
};

export interface OfflineBannerProps {
  visible: boolean;
  onRetry?: () => void;
  style?: ViewStyle;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ visible, onRetry, style }) => {
  const translateY = useSharedValue(-60);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, springConfig);
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      translateY.value = withTiming(-60, { duration: 200 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!visible) {
    return null;
  }

  return (
    <AnimatedView style={[styles.offlineBanner, animatedStyle, style]}>
      <BlurView intensity={100} style={StyleSheet.absoluteFill as ViewStyle}>
        <View style={styles.offlineContent}>
          <Ionicons name="cloud-offline" size={18} color={Colors.warning[500]} />
          <Text style={styles.offlineText}>网络连接已断开</Text>
          {onRetry && (
            <TouchableOpacity style={styles.offlineRetry} onPress={onRetry}>
              <Text style={styles.offlineRetryText}>重试</Text>
            </TouchableOpacity>
          )}
        </View>
      </BlurView>
    </AnimatedView>
  );
};

const useStyles = createStyles((colors) => ({
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: DesignTokens.spacing[10],
  },
  emptyIconContainer: {
    marginBottom: Spacing.lg,
  },
  emptyIconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "700",
    color: Colors.neutral[800],
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  emptyDescription: {
    fontSize: DesignTokens.typography.sizes.base,
    color: Colors.neutral[500],
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  emptyAction: {
    borderRadius: 24,
    overflow: "hidden",
  },
  emptyActionGradient: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: DesignTokens.spacing['3.5'],
    borderRadius: 24,
  },
  emptyActionText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.textInverse,
  },
  emptySecondaryAction: {
    marginTop: DesignTokens.spacing[3],
    paddingVertical: DesignTokens.spacing['2.5'],
  },
  emptySecondaryText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: Colors.primary[500],
    fontWeight: "500",
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: DesignTokens.spacing[10],
  },
  errorIllustration: {
    marginBottom: Spacing.lg,
    alignItems: "center",
  },
  errorIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${Colors.error[500]}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  errorDecorations: {
    position: "absolute",
    width: 140,
    height: 140,
  },
  errorDot: {
    position: "absolute",
    width: Spacing.sm,
    height: Spacing.sm,
    borderRadius: 4,
    backgroundColor: Colors.error[300],
  },
  errorDot1: {
    top: DesignTokens.spacing['2.5'],
    left: DesignTokens.spacing[5],
  },
  errorDot2: {
    top: 30,
    right: 15,
  },
  errorDot3: {
    bottom: DesignTokens.spacing[5],
    left: 30,
  },
  errorTitle: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "700",
    color: Colors.neutral[800],
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  errorMessage: {
    fontSize: DesignTokens.typography.sizes.base,
    color: Colors.neutral[500],
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  errorCodeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.neutral[100],
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    marginBottom: Spacing.lg,
  },
  errorCodeLabel: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: Colors.neutral[500],
    marginRight: Spacing.sm,
  },
  errorCodeValue: {
    fontSize: DesignTokens.typography.sizes.sm,
    fontWeight: "600",
    color: Colors.neutral[700],
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  errorActions: {
    flexDirection: "row",
    gap: DesignTokens.spacing[3],
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.primary[500],
    paddingHorizontal: Spacing.lg,
    paddingVertical: DesignTokens.spacing[3],
    borderRadius: 24,
  },
  retryText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.textInverse,
  },
  reportButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.neutral[100],
    paddingHorizontal: Spacing.lg,
    paddingVertical: DesignTokens.spacing[3],
    borderRadius: 24,
  },
  reportText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "500",
    color: Colors.neutral[600],
  },
  networkContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: DesignTokens.spacing[10],
  },
  networkIconContainer: {
    marginBottom: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  networkIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  networkWaves: {
    position: "absolute",
    width: 160,
    height: 160,
  },
  networkWave: {
    position: "absolute",
    width: DesignTokens.spacing[10],
    height: DesignTokens.spacing[10],
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.neutral[300],
    opacity: 0.5,
  },
  networkWave1: {
    top: 0,
    right: 0,
  },
  networkWave2: {
    bottom: DesignTokens.spacing[5],
    left: DesignTokens.spacing['2.5'],
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  networkWave3: {
    top: 30,
    left: 0,
    width: 25,
    height: 25,
    borderRadius: 12.5,
  },
  networkTitle: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "700",
    color: Colors.neutral[800],
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  networkMessage: {
    fontSize: DesignTokens.typography.sizes.base,
    color: Colors.neutral[500],
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  networkActions: {
    alignItems: "center",
    gap: DesignTokens.spacing[3],
  },
  networkRetryButton: {
    borderRadius: 24,
    overflow: "hidden",
  },
  networkRetryGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: DesignTokens.spacing[3],
    borderRadius: 24,
  },
  networkRetryText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.textInverse,
  },
  networkSettingsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: DesignTokens.spacing['2.5'],
  },
  networkSettingsText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: Colors.neutral[600],
    fontWeight: "500",
  },
  maintenanceContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: DesignTokens.spacing[10],
  },
  maintenanceIconContainer: {
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  maintenanceTools: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: DesignTokens.spacing[9],
    height: DesignTokens.spacing[9],
    borderRadius: 18,
    backgroundColor: `${Colors.warning[500]}20`,
    alignItems: "center",
    justifyContent: "center",
  },
  maintenanceTitle: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "700",
    color: Colors.neutral[800],
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  maintenanceMessage: {
    fontSize: DesignTokens.typography.sizes.base,
    color: Colors.neutral[500],
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  estimatedTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.neutral[100],
    paddingHorizontal: Spacing.md,
    paddingVertical: DesignTokens.spacing['2.5'],
    borderRadius: 12,
    marginBottom: Spacing.lg,
  },
  estimatedTimeText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: Colors.neutral[600],
  },
  maintenanceTips: {
    backgroundColor: Colors.neutral[50],
    padding: Spacing.md,
    borderRadius: 12,
    width: "100%",
  },
  maintenanceTipsTitle: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: Colors.neutral[700],
    marginBottom: Spacing.sm,
  },
  maintenanceTip: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: Colors.neutral[500],
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  permissionContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: DesignTokens.spacing[10],
  },
  permissionIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  permissionLock: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: Spacing.xl,
    height: Spacing.xl,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: DesignTokens.spacing['0.5'] },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  permissionTitle: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "700",
    color: Colors.neutral[800],
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  permissionMessage: {
    fontSize: DesignTokens.typography.sizes.base,
    color: Colors.neutral[500],
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  permissionButton: {
    borderRadius: 24,
    overflow: "hidden",
  },
  permissionButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: DesignTokens.spacing[3],
    borderRadius: 24,
  },
  permissionButtonText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: colors.textInverse,
  },
  successContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: DesignTokens.spacing[10],
  },
  successIconContainer: {
    marginBottom: Spacing.lg,
  },
  successIconGradient: {
    width: Spacing['4xl'],
    height: Spacing['4xl'],
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "700",
    color: Colors.neutral[800],
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  successMessage: {
    fontSize: DesignTokens.typography.sizes.base,
    color: Colors.neutral[500],
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  successAction: {
    paddingVertical: DesignTokens.spacing[3],
  },
  successActionText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: Colors.primary[500],
    fontWeight: "600",
  },
  confettiContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  confetti: {
    position: "absolute",
    width: DesignTokens.spacing['2.5'],
    height: DesignTokens.spacing['2.5'],
    borderRadius: 2,
    top: -20,
  },
  offlineBanner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === "ios" ? 50 : 30,
    zIndex: 100,
  },
  offlineContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: DesignTokens.spacing['2.5'],
    backgroundColor: Colors.warning[50],
  },
  offlineText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: Colors.warning[700],
    fontWeight: "500",
  },
  offlineRetry: {
    marginLeft: Spacing.sm,
    paddingHorizontal: DesignTokens.spacing[3],
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.warning[500],
    borderRadius: 12,
  },
  offlineRetryText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textInverse,
    fontWeight: "600",
  },
}))

export default {
  EmptyState,
  ErrorState,
  NetworkError,
  MaintenanceScreen,
  PermissionDenied,
  SuccessState,
  OfflineBanner,
};
