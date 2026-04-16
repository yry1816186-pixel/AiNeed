import React, { useState, useCallback } from "react";
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
} from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import { authApi } from '../../../services/api/auth.api';
import { useTranslation } from '../../../i18n';

import { wechatAuth } from '../../../services/auth/wechat';
import { useAuthStore } from '../stores/index';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';
import { DesignTokens } from '../../../design-system/theme/tokens/design-tokens';
import type { RootStackParamList } from '../../../types/navigation';

type LoginNavigationProp = NavigationProp<RootStackParamList>;

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginNavigationProp>();
  const { setUser, setToken, onboardingCompleted } = useAuthStore();
  const t = useTranslation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [wechatLoading, setWechatLoading] = useState(false);

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

      if (onboardingCompleted) {
        navigation.reset({
          index: 0,
          routes: [{ name: "MainTabs" }],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: "Onboarding" }],
        });
      }
    },
    [setToken, setUser, navigation]
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
    navigation.navigate("PhoneLogin" as never);
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
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            disabled={isLoading || wechatLoading}
            accessibilityLabel={t.common.back}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.content}>
          <View style={styles.brandSection}>
            <View style={styles.logoContainer}>
              <Ionicons name="shirt-outline" size={36} color={colors.surface} />
            </View>
            <Text style={styles.brandName}>寻裳</Text>
          </View>
          <Text style={styles.title}>{t.auth.login}</Text>
          <Text style={styles.subtitle}>{t.auth.login}</Text>
          <View style={styles.form}>
            <View style={styles.inputGroup}>
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
                accessibilityLabel={t.auth.email}
                onSubmitEditing={() => {
                  if (password === "") {
                    return;
                  }
                  void handleLogin();
                }}
              />
            </View>
            <View style={styles.inputGroup}>
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
            </View>

            <TouchableOpacity
              style={styles.forgotPasswordLink}
              onPress={handleForgotPassword}
              disabled={isLoading || wechatLoading}
              accessibilityLabel={t.auth.forgotPassword}
            >
              <Text style={styles.forgotPasswordText}>{t.auth.forgotPassword}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading || wechatLoading}
              activeOpacity={0.7}
              accessibilityLabel={t.auth.login}
              accessibilityRole="button"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.surface} />
              ) : (
                <Text style={styles.loginButtonText}>{t.auth.login}</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>或</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.wechatButton}
              onPress={handleWechatLogin}
              disabled={isLoading || wechatLoading}
              activeOpacity={0.7}
              accessibilityLabel="微信登录"
              accessibilityRole="button"
            >
              {wechatLoading ? (
                <ActivityIndicator size="small" color={DesignTokens.colors.neutral.white} />
              ) : (
                <>
                  <Ionicons name="logo-wechat" size={22} color={DesignTokens.colors.neutral.white} />
                  <Text style={styles.wechatButtonText}>微信一键登录</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.phoneLoginButton}
              onPress={handlePhoneLogin}
              disabled={isLoading || wechatLoading}
              activeOpacity={0.7}
              accessibilityLabel="手机号登录"
              accessibilityRole="button"
            >
              <Ionicons name="phone-portrait-outline" size={20} color={colors.primary} />
              <Text style={styles.phoneLoginText}>手机号登录</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.registerLink}
              onPress={() => navigation.navigate("Register")}
              disabled={isLoading || wechatLoading}
              accessibilityLabel={t.auth.register}
              accessibilityRole="button"
            >
              <Text style={styles.registerText}>{t.auth.register}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { padding: 20 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DesignTokens.colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
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
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  brandName: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 1.2,
  },
  title: { fontSize: DesignTokens.typography.sizes['3xl'], fontWeight: "700", color: colors.text },
  subtitle: { fontSize: DesignTokens.typography.sizes.md, color: colors.textSecondary, marginTop: 8, marginBottom: 32 },
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
  input: { flex: 1, fontSize: DesignTokens.typography.sizes.md, color: colors.text },
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
  loginButtonDisabled: { backgroundColor: colors.primaryLight },
  loginButtonText: { fontSize: DesignTokens.typography.sizes.md, fontWeight: "600", color: colors.surface },
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
    backgroundColor: "DesignTokens.colors.semantic.success", // custom color
    borderRadius: theme.BorderRadius.md,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    minHeight: 52,
  },
  wechatButtonText: { fontSize: DesignTokens.typography.sizes.md, fontWeight: "600", color: DesignTokens.colors.neutral.white },
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
  phoneLoginText: { fontSize: DesignTokens.typography.sizes.md, fontWeight: "500", color: colors.primary },
  registerLink: { alignItems: "center", marginTop: 16 },
  registerText: { fontSize: DesignTokens.typography.sizes.base, color: colors.primary },
});

export default LoginScreen;
