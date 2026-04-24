/* eslint-disable @typescript-eslint/no-misused-promises, react-hooks/rules-of-hooks */
import React, { useState, useCallback, useEffect, useRef } from "react";
import { withErrorBoundary } from "../../../shared/components/ErrorBoundary";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
} from "react-native-reanimated";
import { smsApi } from "../../../services/api/sms.api";
import { useTranslation } from "../../../i18n";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";
import { DesignTokens } from "../../../design-system/theme";
import { Spacing, BorderRadius } from "../../../design-system/theme";
import type { AuthStackParamList } from "../../../navigation/types";

type ForgotPasswordNavProp = NavigationProp<AuthStackParamList>;

const COUNTDOWN_SECONDS = 60;
const CODE_LENGTH = 6;

export const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation<ForgotPasswordNavProp>();
  const t = useTranslation();
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const headerOpacity = useSharedValue(0);
  const headerTranslateY = useSharedValue(20);
  const formOpacity = useSharedValue(0);
  const formTranslateY = useSharedValue(30);

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 600 });
    headerTranslateY.value = withSpring(0, { damping: 16, stiffness: 90 });
    formOpacity.value = withDelay(300, withTiming(1, { duration: 500 }));
    formTranslateY.value = withDelay(300, withSpring(0, { damping: 16, stiffness: 80 }));
  }, []);

  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  const headerAnim = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const formAnim = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ translateY: formTranslateY.value }],
  }));

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
    return /^1[3-9]\d{9}$/.test(phoneNumber.trim());
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
      } else {
        Alert.alert(t.common.error, response.error?.message || t.common.retry);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : t.errors.networkError;
      Alert.alert(t.common.error, message);
    } finally {
      setIsSendingCode(false);
    }
  }, [phone, countdown, validatePhone, startCountdown, t]);

  const handleCodeChange = useCallback((text: string) => {
    setCode(text.replace(/[^0-9]/g, "").slice(0, CODE_LENGTH));
  }, []);

  const handleNext = useCallback(() => {
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
    if (!trimmedCode || trimmedCode.length !== CODE_LENGTH) {
      Alert.alert(t.common.confirm, t.auth.codePlaceholder);
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      navigation.navigate("ResetPassword", { phone: trimmedPhone, codeToken: trimmedCode });
    }, 500);
  }, [phone, code, validatePhone, navigation, t]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.blob1} />
          <View style={styles.blob2} />
          <View style={styles.blob3} />

          <Animated.View style={[styles.headerArea, headerAnim]}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              accessibilityLabel="返回"
            >
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title}>忘记密码</Text>
            <Text style={styles.subtitle}>验证手机号后重置密码</Text>
          </Animated.View>

          <Animated.View style={[styles.formArea, formAnim]}>
            <View style={styles.card}>
              <View style={styles.phoneRow}>
                <View style={styles.prefixWrap}>
                  <Text style={styles.prefixText}>+86</Text>
                </View>
                <View style={styles.phoneDivider} />
                <TextInput
                  style={styles.phoneInput}
                  placeholder="请输入手机号"
                  placeholderTextColor={colors.textTertiary}
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
            </View>

            <TouchableOpacity
              style={[
                styles.sendCodeBtn,
                (countdown > 0 || isSendingCode) && styles.sendCodeBtnDisabled,
              ]}
              onPress={handleSendCode}
              disabled={countdown > 0 || isSendingCode || isLoading}
              activeOpacity={0.8}
              accessibilityLabel="获取验证码"
            >
              {isSendingCode ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.sendCodeBtnText}>
                  {countdown > 0 ? `${countdown}s 后重新获取` : "获取验证码"}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.card}>
              <Text style={styles.codeLabel}>输入验证码</Text>
              <View style={styles.codeRow}>
                {Array.from({ length: CODE_LENGTH }).map((_, i) => {
                  const styles = useStyles(colors);
                  const digit = code[i] || "";
                  const isFocused = code.length === i;
                  return (
                    <View key={i} style={[styles.digitBox, isFocused && styles.digitBoxFocused]}>
                      <Text style={styles.digitText}>{digit}</Text>
                    </View>
                  );
                })}
              </View>
              <TextInput
                style={styles.hiddenCodeInput}
                value={code}
                onChangeText={handleCodeChange}
                keyboardType="number-pad"
                maxLength={CODE_LENGTH}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                returnKeyType="go"
                accessibilityLabel="验证码"
                onSubmitEditing={handleNext}
                caretHidden
              />
            </View>

            <TouchableOpacity
              style={[styles.nextBtn, isLoading && styles.nextBtnDisabled]}
              onPress={handleNext}
              disabled={isLoading}
              activeOpacity={0.8}
              accessibilityLabel="下一步"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.nextBtnText}>下一步</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backToLoginLink}
              onPress={() => navigation.navigate("Login")}
              disabled={isLoading}
            >
              <Text style={styles.backToLoginText}>返回登录</Text>
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.bottomStrip}>
            <View style={[styles.stripSeg, { backgroundColor: colors.primary, flex: 2 }]} />
            <View style={[styles.stripSeg, { backgroundColor: colors.gold, flex: 1.5 }]} />
            <View style={[styles.stripSeg, { backgroundColor: colors.warmSecondary, flex: 1.2 }]} />
            <View style={[styles.stripSeg, { backgroundColor: colors.warmPrimary, flex: 1 }]} />
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const useStyles = createStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.background },
  blob1: {
    position: "absolute",
    top: -80,
    left: -50,
    width: 240,
    height: 240,
    borderRadius: BorderRadius.full,
    backgroundColor: colors.warmAccent,
    opacity: 0.45,
  },
  blob2: {
    position: "absolute",
    top: 40,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: BorderRadius.full,
    backgroundColor: colors.warmSecondary,
    opacity: 0.35,
  },
  blob3: {
    position: "absolute",
    bottom: 180,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: BorderRadius.full,
    backgroundColor: colors.warmPrimary,
    opacity: 0.25,
  },
  headerArea: {
    paddingTop: DesignTokens.spacing[4],
    paddingHorizontal: DesignTokens.spacing[6],
    paddingBottom: DesignTokens.spacing[4],
  },
  backBtn: {
    marginBottom: DesignTokens.spacing[3],
    padding: Spacing.xs,
    alignSelf: "flex-start",
  },
  title: {
    fontSize: DesignTokens.typography.sizes["3xl"],
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textSecondary,
    marginTop: Spacing.sm,
    letterSpacing: 1,
  },
  formArea: {
    flex: 1,
    paddingHorizontal: DesignTokens.spacing[6],
    gap: DesignTokens.spacing[4],
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.xl,
    padding: DesignTokens.spacing[4],
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  phoneRow: { flexDirection: "row", alignItems: "center", minHeight: 50 },
  prefixWrap: { paddingHorizontal: DesignTokens.spacing[3], paddingVertical: Spacing.sm },
  prefixText: {
    fontSize: DesignTokens.typography.sizes.md,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  phoneDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.borderLight,
    marginRight: DesignTokens.spacing[3],
  },
  phoneInput: {
    flex: 1,
    fontSize: DesignTokens.typography.sizes.md,
    color: colors.textPrimary,
    letterSpacing: 2,
    paddingVertical: Spacing.sm,
  },
  sendCodeBtn: {
    backgroundColor: colors.primary,
    borderRadius: BorderRadius["2xl"],
    paddingVertical: DesignTokens.spacing[3.5],
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 4,
  },
  sendCodeBtnDisabled: {
    backgroundColor: colors.textTertiary,
    shadowOpacity: 0,
    elevation: 0,
  },
  sendCodeBtnText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "600",
    color: "#fff",
    letterSpacing: 2,
  },
  codeLabel: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: Spacing.md,
    letterSpacing: 0.5,
  },
  codeRow: { flexDirection: "row", justifyContent: "space-between", gap: Spacing.sm },
  digitBox: {
    flex: 1,
    height: 52,
    borderRadius: BorderRadius.lg,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.borderLight,
  },
  digitBoxFocused: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  digitText: {
    fontSize: DesignTokens.typography.sizes.xl,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  hiddenCodeInput: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    opacity: 0,
  },
  nextBtn: {
    backgroundColor: colors.primary,
    borderRadius: BorderRadius["2xl"],
    paddingVertical: Spacing.md,
    alignItems: "center",
    justifyContent: "center",
    marginTop: DesignTokens.spacing[2],
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 4,
  },
  nextBtnDisabled: { opacity: 0.6 },
  nextBtnText: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 4,
  },
  backToLoginLink: {
    alignItems: "center",
    marginTop: DesignTokens.spacing[3],
    paddingVertical: Spacing.sm,
  },
  backToLoginText: {
    fontSize: DesignTokens.typography.sizes.base,
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  bottomStrip: { flexDirection: "row", height: 5 },
  stripSeg: { height: 5 },
}));

export default withErrorBoundary(ForgotPasswordScreen);
