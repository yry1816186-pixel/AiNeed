import React, { useState, useCallback, useEffect } from "react";
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
import { useNavigation, useRoute, RouteProp, NavigationProp } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@/src/polyfills/expo-vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
} from "react-native-reanimated";
import { authApi } from "../../../services/api/auth.api";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";
import { DesignTokens } from "../../../design-system/theme";
import { Spacing, BorderRadius } from "../../../design-system/theme";
import type { AuthStackParamList } from "../../../navigation/types";

type ResetPasswordNavProp = NavigationProp<AuthStackParamList>;
type ResetPasswordRouteProp = RouteProp<AuthStackParamList, "ResetPassword">;

type StrengthLevel = "weak" | "medium" | "strong";

function getPasswordStrength(password: string): StrengthLevel {
  if (!password) return "weak";
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  if (score <= 2) return "weak";
  if (score <= 3) return "medium";
  return "strong";
}

export const ResetPasswordScreen: React.FC = () => {
  const navigation = useNavigation<ResetPasswordNavProp>();
  const route = useRoute<ResetPasswordRouteProp>();
  const { codeToken } = route.params;
  const { colors } = useTheme();
  const styles = useStyles(colors);

  const STRENGTH_MAP: Record<StrengthLevel, { label: string; color: string; percent: number }> = {
    weak: { label: "弱", color: colors.error, percent: 33 },
    medium: { label: "中", color: colors.gold, percent: 66 },
    strong: { label: "强", color: colors.success, percent: 100 },
  };

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const strength = getPasswordStrength(newPassword);
  const strengthConfig = STRENGTH_MAP[strength];

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

  const headerAnim = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const formAnim = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ translateY: formTranslateY.value }],
  }));

  const handleReset = useCallback(async () => {
    Keyboard.dismiss();

    if (!newPassword) {
      Alert.alert("提示", "请输入新密码");
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert("提示", "密码长度至少8位");
      return;
    }
    if (!confirmPassword) {
      Alert.alert("提示", "请确认密码");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("提示", "两次密码不一致");
      return;
    }

    setIsLoading(true);
    try {
      const response = await authApi.resetPassword(codeToken, newPassword);
      if (response.success) {
        Alert.alert("成功", "密码重置成功，请重新登录", [
          { text: "确定", onPress: () => navigation.navigate("Login") },
        ]);
      } else {
        Alert.alert("重置失败", response.error?.message || "请重试");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "网络连接失败";
      Alert.alert("重置失败", message);
    } finally {
      setIsLoading(false);
    }
  }, [newPassword, confirmPassword, codeToken, navigation]);

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
            <Text style={styles.title}>重置密码</Text>
            <Text style={styles.subtitle}>设置你的新密码</Text>
          </Animated.View>

          <Animated.View style={[styles.formArea, formAnim]}>
            <View style={styles.card}>
              <Text style={styles.inputLabel}>新密码</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.textInput}
                  placeholder="请输入新密码"
                  placeholderTextColor={colors.textTertiary}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showNewPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                  returnKeyType="next"
                  accessibilityLabel="新密码"
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  accessibilityLabel={showNewPassword ? "隐藏密码" : "显示密码"}
                >
                  <Ionicons
                    name={showNewPassword ? "eye-outline" : "eye-off-outline"}
                    size={22}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {newPassword.length > 0 && (
                <View style={styles.strengthContainer}>
                  <View style={styles.strengthBarBg}>
                    <View
                      style={[
                        styles.strengthBarFill,
                        {
                          width: `${strengthConfig.percent}%`,
                          backgroundColor: strengthConfig.color,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.strengthLabel, { color: strengthConfig.color }]}>
                    密码强度：{strengthConfig.label}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.inputLabel}>确认密码</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.textInput}
                  placeholder="请再次输入密码"
                  placeholderTextColor={colors.textTertiary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                  returnKeyType="go"
                  accessibilityLabel="确认密码"
                  onSubmitEditing={handleReset}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  accessibilityLabel={showConfirmPassword ? "隐藏密码" : "显示密码"}
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                    size={22}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <Text style={styles.mismatchText}>两次密码不一致</Text>
              )}
            </View>

            <TouchableOpacity
              style={[styles.resetBtn, isLoading && styles.resetBtnDisabled]}
              onPress={handleReset}
              disabled={isLoading}
              activeOpacity={0.8}
              accessibilityLabel="确认重置"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.resetBtnText}>确认重置</Text>
              )}
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
  inputLabel: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textSecondary,
    marginBottom: DesignTokens.spacing[3],
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 50,
  },
  textInput: {
    flex: 1,
    fontSize: DesignTokens.typography.sizes.md,
    color: colors.textPrimary,
    paddingVertical: Spacing.sm,
    letterSpacing: 1,
  },
  eyeBtn: { padding: Spacing.sm },
  strengthContainer: {
    marginTop: DesignTokens.spacing[3],
    gap: DesignTokens.spacing[1.5],
  },
  strengthBarBg: {
    height: 4,
    borderRadius: BorderRadius.xs,
    backgroundColor: colors.borderLight,
    overflow: "hidden",
  },
  strengthBarFill: {
    height: 4,
    borderRadius: BorderRadius.xs,
  },
  strengthLabel: {
    fontSize: DesignTokens.typography.sizes.sm,
    letterSpacing: 0.5,
  },
  mismatchText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.error,
    marginTop: Spacing.sm,
    letterSpacing: 0.5,
  },
  resetBtn: {
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
  resetBtnDisabled: { opacity: 0.6 },
  resetBtnText: {
    fontSize: DesignTokens.typography.sizes.lg,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 4,
  },
  bottomStrip: { flexDirection: "row", height: 5 },
  stripSeg: { height: 5 },
}));

export default withErrorBoundary(ResetPasswordScreen);
