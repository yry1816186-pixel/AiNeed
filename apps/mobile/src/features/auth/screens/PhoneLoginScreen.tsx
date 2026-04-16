import React, { useState, useCallback, useEffect, useRef } from "react";
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
import { smsApi } from "../services/api/sms.api";
import { useTranslation } from "../i18n";
import { useAuthStore } from "../stores/index";
import { theme } from '../design-system/theme';
import { DesignTokens } from "../theme/tokens/design-tokens";
import type { RootStackParamList } from "../types/navigation";

type PhoneLoginNavigationProp = NavigationProp<RootStackParamList>;

const COUNTDOWN_SECONDS = 60;

export const PhoneLoginScreen: React.FC = () => {
  const navigation = useNavigation<PhoneLoginNavigationProp>();
  const { setUser, setToken, onboardingCompleted } = useAuthStore();
  const t = useTranslation();

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  const startCountdown = useCallback(() => {
    setCountdown(COUNTDOWN_SECONDS);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownRef.current) {
            clearInterval(countdownRef.current);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const validatePhone = useCallback((phoneNumber: string): boolean => {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phoneNumber.trim());
  }, []);

  const handleSendCode = useCallback(async () => {
    const trimmedPhone = phone.trim();

    if (!trimmedPhone) {
      Alert.alert(t.common.confirm, t.auth.phoneRequired);
      return;
    }

    if (!validatePhone(trimmedPhone)) {
      Alert.alert(t.common.confirm, t.errors.validationError);
      return;
    }

    if (countdown > 0) {
      return;
    }

    setIsSendingCode(true);
    try {
      const response = await smsApi.sendCode(trimmedPhone);
      if (response.success) {
        startCountdown();
        Alert.alert(t.common.done, t.common.done);
      } else {
        Alert.alert(t.common.error, response.error?.message || t.common.retry);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t.errors.networkError;
      Alert.alert(t.common.error, message);
    } finally {
      setIsSendingCode(false);
    }
  }, [phone, countdown, validatePhone, startCountdown]);

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

    const trimmedPhone = phone.trim();
    const trimmedCode = code.trim();

    if (!trimmedPhone) {
      Alert.alert(t.common.confirm, t.auth.phoneRequired);
      return;
    }

    if (!validatePhone(trimmedPhone)) {
      Alert.alert(t.common.confirm, t.errors.validationError);
      return;
    }

    if (!trimmedCode) {
      Alert.alert(t.common.confirm, t.auth.codePlaceholder);
      return;
    }

    if (trimmedCode.length !== 6) {
      Alert.alert(t.common.confirm, t.errors.validationError);
      return;
    }

    setIsLoading(true);

    try {
      const response = await smsApi.loginWithPhone(trimmedPhone, trimmedCode);
      if (response.success && response.data) {
        const { user, accessToken } = response.data;
        await handleLoginSuccess({ ...user, email: user.email ?? "" }, accessToken);
      } else {
        Alert.alert(t.auth.login, response.error?.message || t.errors.unauthorized);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t.errors.networkError;
      Alert.alert(t.auth.login, message);
    } finally {
      setIsLoading(false);
    }
  }, [phone, code, validatePhone, handleLoginSuccess]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            disabled={isLoading}
            accessibilityLabel="返回"
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.content}>
          <View style={styles.brandSection}>
            <View style={styles.logoContainer}>
              <Ionicons name="phone-portrait-outline" size={36} color={theme.colors.surface} />
            </View>
            <Text style={styles.brandName}>寻裳</Text>
          </View>
          <Text style={styles.title}>{t.auth.login}</Text>
          <Text style={styles.subtitle}>{t.auth.welcomeBack}</Text>
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Ionicons name="phone-portrait-outline" size={20} color={theme.colors.textTertiary} />
              <TextInput
                style={styles.input}
                placeholder={t.auth.phonePlaceholder}
                placeholderTextColor={theme.colors.textTertiary}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                maxLength={11}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                returnKeyType="next"
                accessibilityLabel="手机号"
              />
            </View>
            <View style={styles.inputGroup}>
              <Ionicons name="keypad-outline" size={20} color={theme.colors.textTertiary} />
              <TextInput
                style={styles.codeInput}
                placeholder={t.auth.codePlaceholder}
                placeholderTextColor={theme.colors.textTertiary}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                returnKeyType="go"
                accessibilityLabel="验证码"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                style={[
                  styles.codeButton,
                  (countdown > 0 || isSendingCode) && styles.codeButtonDisabled,
                ]}
                onPress={handleSendCode}
                disabled={countdown > 0 || isSendingCode || isLoading}
                accessibilityLabel={countdown > 0 ? t.common.retry : t.common.confirm}
              >
                {isSendingCode ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                  <Text
                    style={[styles.codeButtonText, countdown > 0 && styles.codeButtonTextDisabled]}
                  >
                    {countdown > 0 ? `${countdown}s` : t.common.confirm}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.7}
              accessibilityLabel="登录"
              accessibilityRole="button"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={theme.colors.surface} />
              ) : (
                <Text style={styles.loginButtonText}>{t.auth.login}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.emailLoginLink}
              onPress={() => navigation.navigate("Login")}
              disabled={isLoading}
              accessibilityLabel="使用邮箱登录"
            >
              <Text style={styles.emailLoginText}>{t.auth.email}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.registerLink}
              onPress={() => navigation.navigate("Register")}
              disabled={isLoading}
              accessibilityLabel="没有账户？立即注册"
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
  container: { flex: 1, backgroundColor: theme.colors.surface },
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
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  brandName: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.primary,
    letterSpacing: 1.2,
  },
  title: { fontSize: 32, fontWeight: "700", color: theme.colors.text },
  subtitle: { fontSize: 16, color: theme.colors.textSecondary, marginTop: 8, marginBottom: 32 },
  form: { gap: 16 },
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.background,
    borderRadius: theme.BorderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  input: { flex: 1, fontSize: 16, color: theme.colors.text },
  codeInput: { flex: 1, fontSize: 16, color: theme.colors.text },
  codeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.BorderRadius.sm,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    minWidth: 90,
    alignItems: "center",
    justifyContent: "center",
  },
  codeButtonDisabled: {
    borderColor: theme.colors.textTertiary,
  },
  codeButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: theme.colors.primary,
  },
  codeButtonTextDisabled: {
    color: theme.colors.textTertiary,
  },
  loginButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.BorderRadius.md,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    minHeight: 52,
    ...theme.Shadows.brand,
  },
  loginButtonDisabled: { backgroundColor: theme.colors.primaryLight },
  loginButtonText: { fontSize: 16, fontWeight: "600", color: theme.colors.surface },
  emailLoginLink: { alignItems: "center", marginTop: 16 },
  emailLoginText: { fontSize: 14, color: theme.colors.primary },
  registerLink: { alignItems: "center", marginTop: 8 },
  registerText: { fontSize: 14, color: theme.colors.primary },
});

export default PhoneLoginScreen;
