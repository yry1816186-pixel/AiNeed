/* eslint-disable @typescript-eslint/no-misused-promises, @typescript-eslint/require-await */

import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
  type ViewStyle,
} from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { authApi } from "../../../services/api/auth.api";
import { useTranslation } from "../../../i18n";

import { wechatAuth } from "../../../services/auth/wechat";
import { useAuthStore } from "../stores/index";

import { DesignTokens, flatColors as colors, theme } from "../../../design-system/theme";
import type { AuthStackParamList } from "../../../navigation/types";
import {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  interpolate,
  Easing,
} from "react-native-reanimated";
import AnimatedReanimated from "react-native-reanimated";
import { LinearGradient } from "@/src/polyfills/expo-linear-gradient";

const AnimatedView = AnimatedReanimated.createAnimatedComponent(View);
const AnimatedTouchableOpacity = AnimatedReanimated.createAnimatedComponent(TouchableOpacity);

// ── Staggered entrance animation wrapper ──────────────────────────
const FadeIn: React.FC<{
  delay: number;
  children: React.ReactNode;
  style?: ViewStyle;
  distance?: number;
}> = ({ delay, children, style, distance = 22 }) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(distance);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 500, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
    );
    translateY.value = withDelay(delay, withSpring(0, { damping: 20, stiffness: 100 }));
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <AnimatedView style={[animatedStyle, style]}>{children}</AnimatedView>;
};

// ── Scale-on-press button wrapper ──────────────────────────────────
const ScaleButton: React.FC<{
  onPress: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
  accessibilityLabel?: string;
}> = ({ onPress, disabled, children, style, accessibilityLabel }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedTouchableOpacity
      style={[animatedStyle, style]}
      onPress={disabled ? undefined : onPress}
      onPressIn={() => {
        if (!disabled) {
          scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
        }
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      }}
      activeOpacity={0.7}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      {children}
    </AnimatedTouchableOpacity>
  );
};

type LoginNavigationProp = NavigationProp<AuthStackParamList>;

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginNavigationProp>();
  const { setUser, setToken, onboardingCompleted } = useAuthStore();
  const t = useTranslation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [wechatLoading, setWechatLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  // ── Logo animations ──
  const logoScale = useSharedValue(0);
  const logoOpacity = useSharedValue(0);
  const logoGlow = useSharedValue(0);

  // ── Login button animations ──
  const loginBtnScale = useSharedValue(1);
  const loginBtnGlow = useSharedValue(0);

  // ── Input focus animations ──
  const emailFocusProgress = useSharedValue(0);
  const passwordFocusProgress = useSharedValue(0);

  useEffect(() => {
    logoScale.value = withSpring(1, { damping: 8, stiffness: 80 });
    logoOpacity.value = withTiming(1, { duration: 400 });
    logoGlow.value = withRepeat(
      withSequence(withTiming(1, { duration: 2000 }), withTiming(0, { duration: 2000 })),
      -1,
      true
    );
  }, []);

  useEffect(() => {
    if (isLoading) {
      loginBtnGlow.value = withRepeat(
        withSequence(withTiming(1, { duration: 800 }), withTiming(0.3, { duration: 800 })),
        -1,
        true
      );
      loginBtnScale.value = withSpring(1, { damping: 15, stiffness: 200 });
    } else {
      loginBtnGlow.value = withTiming(0, { duration: 300 });
    }
  }, [isLoading]);

  useEffect(() => {
    emailFocusProgress.value = withTiming(emailFocused ? 1 : 0, { duration: 200 });
  }, [emailFocused]);

  useEffect(() => {
    passwordFocusProgress.value = withTiming(passwordFocused ? 1 : 0, { duration: 200 });
  }, [passwordFocused]);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: interpolate(logoGlow.value, [0, 1], [0.15, 0.45]),
    shadowRadius: interpolate(logoGlow.value, [0, 1], [8, 25]),
    elevation: interpolate(logoGlow.value, [0, 1], [4, 12]),
  }));

  const emailInputStyle = useAnimatedStyle(() => ({
    borderWidth: interpolate(emailFocusProgress.value, [0, 1], [0, 1.5]),
    shadowOpacity: interpolate(emailFocusProgress.value, [0, 1], [0, 0.1]),
    elevation: interpolate(emailFocusProgress.value, [0, 1], [0, 3]),
  }));

  const passwordInputStyle = useAnimatedStyle(() => ({
    borderWidth: interpolate(passwordFocusProgress.value, [0, 1], [0, 1.5]),
    shadowOpacity: interpolate(passwordFocusProgress.value, [0, 1], [0, 0.1]),
    elevation: interpolate(passwordFocusProgress.value, [0, 1], [0, 3]),
  }));

  const loginBtnAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: loginBtnScale.value }],
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: interpolate(loginBtnGlow.value, [0, 1], [0.1, 0.4]),
    shadowRadius: interpolate(loginBtnGlow.value, [0, 1], [8, 20]),
    elevation: interpolate(loginBtnGlow.value, [0, 1], [4, 12]),
  }));

  const validateInputs = useCallback((): string | null => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      return t.auth.email;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return t.errors.validationError;
    }
    if (!password) {
      return t.auth.password;
    }
    if (password.length < 6) {
      return "密码至少需要6个字符";
    }
    return null;
  }, [email, password]);

  const getErrorMessage = (error: unknown): string => {
    if (typeof error === "object" && error !== null) {
      const err = error as Record<string, unknown>;
      if (typeof err.response === "object" && err.response !== null) {
        const response = err.response as Record<string, unknown>;
        if (typeof response.data === "object" && response.data !== null) {
          const data = response.data as Record<string, unknown>;
          if (typeof data.error === "string") {
            return data.error;
          }
        }
      }
      if (typeof err.message === "string") {
        return err.message;
      }
    }
    return t.errors.networkError || "网络连接失败，请检查网络后重试";
  };

  const handleLoginSuccess = useCallback(
    async (
      user: {
        id: string;
        email: string;
        nickname?: string;
        avatar?: string;
        createdAt?: string;
        updatedAt?: string;
      },
      token: string
    ) => {
      setToken(token);
      setUser({
        ...user,
        createdAt: user.createdAt || new Date().toISOString(),
        updatedAt: user.updatedAt || new Date().toISOString(),
      });
    },
    [setToken, setUser, onboardingCompleted]
  );

  const handleLogin = useCallback(async () => {
    Keyboard.dismiss();

    const validationError = validateInputs();
    if (validationError) {
      Alert.alert(t.errors.validationError, validationError);
      return;
    }

    setIsLoading(true);

    try {
      const response = await authApi.login({
        email: email.trim(),
        password,
      });

      if (response.success && response.data) {
        const { user, token } = response.data;
        await handleLoginSuccess(user, token);
      } else {
        Alert.alert(
          t.auth.login,
          (typeof response.error === "string" ? response.error : response.error?.message) ||
            t.errors.unauthorized
        );
      }
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      Alert.alert(t.auth.login, message);
    } finally {
      setIsLoading(false);
    }
  }, [email, password, validateInputs, handleLoginSuccess]);

  const handleWechatLogin = useCallback(async () => {
    setWechatLoading(true);
    try {
      const response = await wechatAuth.loginWithWechat();
      if (response.success && response.data) {
        const { user, accessToken } = response.data;
        await handleLoginSuccess(user, accessToken);
      } else {
        Alert.alert(t.auth.login, response.error?.message || t.common.retry);
      }
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      Alert.alert(t.auth.login, message);
    } finally {
      setWechatLoading(false);
    }
  }, [handleLoginSuccess]);

  const handlePhoneLogin = useCallback(() => {
    navigation.navigate("PhoneLogin");
  }, [navigation]);

  const handleForgotPassword = useCallback(async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      Alert.alert(t.common.confirm, t.auth.email);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert(t.common.confirm, t.errors.validationError);
      return;
    }

    Alert.alert(t.auth.forgotPassword, `将向 ${trimmedEmail} 发送密码重置链接，确认发送？`, [
      { text: t.common.cancel, style: "cancel" },
      {
        text: t.common.confirm,
        style: "default",
        onPress: async () => {
          try {
            const response = await authApi.forgotPassword(trimmedEmail);
            if (response.success) {
              Alert.alert(t.common.done, "密码重置链接已发送到您的邮箱，请查收");
            } else {
              Alert.alert(
                "发送失败",
                (typeof response.error === "string" ? response.error : response.error?.message) ||
                  t.common.retry
              );
            }
          } catch (error: unknown) {
            const message = getErrorMessage(error);
            Alert.alert(t.common.error, message);
          }
        },
      },
    ]);
  }, [email]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[colors.primary + "0A", colors.primary + "03", colors.surface]}
          locations={[0, 0.4, 1]}
          style={styles.bgGradient}
          pointerEvents="none"
        />

        <View style={styles.content}>
          <View style={styles.brandSection}>
            <AnimatedView style={[styles.logoContainer, logoAnimatedStyle]}>
              <LinearGradient
                colors={[colors.primary, DesignTokens.colors.brand.camel]}
                style={styles.logoGradient}
              >
                <Ionicons name="shirt-outline" size={36} color={colors.surface} />
              </LinearGradient>
            </AnimatedView>
            <FadeIn delay={200}>
              <Text style={styles.brandName}>寻裳</Text>
            </FadeIn>
          </View>

          <FadeIn delay={350}>
            <Text style={styles.title}>{t.auth.login}</Text>
            <Text style={styles.subtitle}>{t.auth.login}</Text>
          </FadeIn>

          <View style={styles.form}>
            <FadeIn delay={450}>
              <AnimatedView
                style={[styles.inputGroup, { borderColor: colors.primary }, emailInputStyle]}
              >
                <Ionicons name="mail-outline" size={20} color={colors.textTertiary} />
                <TextInput
                  style={styles.input}
                  placeholder={t.auth.email}
                  placeholderTextColor={colors.textTertiary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading && !wechatLoading}
                  returnKeyType="next"
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  accessibilityLabel={t.auth.email}
                  onSubmitEditing={() => {
                    if (password === "") {
                      return;
                    }
                    void handleLogin();
                  }}
                />
              </AnimatedView>
            </FadeIn>

            <FadeIn delay={550}>
              <AnimatedView
                style={[styles.inputGroup, { borderColor: colors.primary }, passwordInputStyle]}
              >
                <Ionicons name="lock-closed-outline" size={20} color={colors.textTertiary} />
                <TextInput
                  style={styles.input}
                  placeholder={t.auth.password}
                  placeholderTextColor={colors.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading && !wechatLoading}
                  returnKeyType="go"
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  accessibilityLabel={t.auth.password}
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((prev) => !prev)}
                  style={styles.eyeButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  disabled={isLoading || wechatLoading}
                  accessibilityLabel={showPassword ? t.common.cancel : t.auth.password}
                >
                  <Ionicons
                    name={showPassword ? "eye-outline" : "eye-off-outline"}
                    size={20}
                    color={colors.textTertiary}
                  />
                </TouchableOpacity>
              </AnimatedView>
            </FadeIn>

            <FadeIn delay={650}>
              <TouchableOpacity
                style={styles.forgotPasswordLink}
                onPress={handleForgotPassword}
                disabled={isLoading || wechatLoading}
                accessibilityLabel={t.auth.forgotPassword}
              >
                <Text style={styles.forgotPasswordText}>{t.auth.forgotPassword}</Text>
              </TouchableOpacity>
            </FadeIn>

            <FadeIn delay={750}>
              <AnimatedTouchableOpacity
                style={[
                  styles.loginButton,
                  isLoading && styles.loginButtonDisabled,
                  loginBtnAnimatedStyle,
                ]}
                onPress={handleLogin}
                disabled={isLoading || wechatLoading}
                activeOpacity={0.7}
                accessibilityLabel={t.auth.login}
                accessibilityRole="button"
                onPressIn={() => {
                  if (!isLoading && !wechatLoading) {
                    loginBtnScale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
                  }
                }}
                onPressOut={() => {
                  loginBtnScale.value = withSpring(1, { damping: 15, stiffness: 300 });
                }}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={colors.surface} />
                ) : (
                  <Text style={styles.loginButtonText}>{t.auth.login}</Text>
                )}
              </AnimatedTouchableOpacity>
            </FadeIn>

            <FadeIn delay={850}>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>或</Text>
                <View style={styles.dividerLine} />
              </View>
            </FadeIn>

            <FadeIn delay={950}>
              <ScaleButton
                onPress={handleWechatLogin}
                disabled={isLoading || wechatLoading}
                accessibilityLabel="微信登录"
              >
                <View style={styles.wechatButton}>
                  {wechatLoading ? (
                    <ActivityIndicator size="small" color={DesignTokens.colors.neutral.white} />
                  ) : (
                    <>
                      <Ionicons
                        name="logo-wechat"
                        size={22}
                        color={DesignTokens.colors.neutral.white}
                      />
                      <Text style={styles.wechatButtonText}>微信一键登录</Text>
                    </>
                  )}
                </View>
              </ScaleButton>
            </FadeIn>

            <FadeIn delay={1050}>
              <ScaleButton
                onPress={handlePhoneLogin}
                disabled={isLoading || wechatLoading}
                accessibilityLabel="手机号登录"
              >
                <View style={styles.phoneLoginButton}>
                  <Ionicons name="phone-portrait-outline" size={20} color={colors.primary} />
                  <Text style={styles.phoneLoginText}>手机号登录</Text>
                </View>
              </ScaleButton>
            </FadeIn>

            <FadeIn delay={1150}>
              <TouchableOpacity
                style={styles.registerLink}
                onPress={() => navigation.navigate("Register")}
                disabled={isLoading || wechatLoading}
                accessibilityLabel={t.auth.register}
                accessibilityRole="button"
              >
                <Text style={styles.registerText}>{t.auth.register}</Text>
              </TouchableOpacity>
            </FadeIn>
          </View>
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  bgGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: { flex: 1, padding: 20 },
  brandSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: theme.BorderRadius.xl,
    overflow: "hidden",
    marginBottom: 12,
  },
  logoGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 1.2,
  },
  title: {
    fontSize: DesignTokens.typography.sizes["3xl"],
    fontWeight: "700",
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: DesignTokens.typography.sizes.md,
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: 32,
  },
  form: { gap: 16 },
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: theme.BorderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  input: { flex: 1, fontSize: DesignTokens.typography.sizes.md, color: colors.textPrimary },
  eyeButton: { padding: 4 },
  forgotPasswordLink: { alignItems: "flex-end" },
  forgotPasswordText: { fontSize: DesignTokens.typography.sizes.base, color: colors.primary },
  loginButton: {
    backgroundColor: colors.primary,
    borderRadius: theme.BorderRadius.md,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    minHeight: 52,
    ...theme.Shadows.brand,
  },
  loginButtonDisabled: { backgroundColor: DesignTokens.colors.semantic.infoLight },
  loginButtonText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: colors.surface,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border || DesignTokens.colors.neutral[200],
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textTertiary,
  },
  wechatButton: {
    backgroundColor: DesignTokens.colors.semantic.success,
    borderRadius: theme.BorderRadius.md,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: 52,
  },
  wechatButtonText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: DesignTokens.colors.neutral.white,
  },
  phoneLoginButton: {
    backgroundColor: colors.background,
    borderRadius: theme.BorderRadius.md,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  phoneLoginText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "500",
    color: colors.primary,
  },
  registerLink: { alignItems: "center", marginTop: 16 },
  registerText: { fontSize: DesignTokens.typography.sizes.base, color: colors.primary },
});

export default LoginScreen;
