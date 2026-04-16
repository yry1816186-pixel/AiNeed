import React, { useState, useCallback, useRef } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@/src/polyfills/expo-vector-icons';
import { authApi } from '../services/api/auth.api';
import { useTranslation } from '../i18n';
import { useAuthStore } from '../stores/index';
import { apiClient } from '../services/api/client';
import { useTheme, createStyles } from '../shared/contexts/ThemeContext';
import { DesignTokens } from '../theme/tokens/design-tokens';
import type { RootStackParamList } from '../types/navigation';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    if (obj.response && typeof obj.response === 'object') {
      const resp = obj.response as Record<string, unknown>;
      if (resp.data && typeof resp.data === 'object') {
        const data = resp.data as Record<string, unknown>;
        if (typeof data.error === 'string') { return data.error; }
      }
    }
    if (typeof obj.message === 'string') { return obj.message; }
  }
  return '网络连接失败，请检查网络后重试';
}

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const { setUser, setToken } = useAuthStore();
  const t = useTranslation();

  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const nicknameInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);

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
      return '密码至少需要6个字符';
    }
    if (!confirmPassword) {
      return '请确认密码';
    }
    if (password !== confirmPassword) {
      return '两次输入的密码不一致';
    }
    if (!agreedToTerms) {
      return '请阅读并同意用户服务协议和隐私政策';
    }
    return null;
  }, [email, password, confirmPassword, agreedToTerms]);

  const handleRegister = useCallback(async () => {
    Keyboard.dismiss();

    const validationError = validateInputs();
    if (validationError) {
      Alert.alert(t.errors.validationError, validationError);
      return;
    }

    setIsLoading(true);

    try {
      const trimmedNickname = nickname.trim();
      const response = await authApi.register({
        email: email.trim(),
        password,
        ...(trimmedNickname ? { nickname: trimmedNickname } : {}),
      });

      if (response.success && response.data) {
        const { user, token } = response.data;
        setToken(token);
        setUser(user);

        // Record privacy consent on client side (server already records in transaction)
        try {
          await Promise.all([
            apiClient.post('/privacy/consent', {
              consentType: 'terms_of_service',
              granted: true,
              version: '1.0.0',
            }),
            apiClient.post('/privacy/consent', {
              consentType: 'privacy_policy',
              granted: true,
              version: '1.0.0',
            }),
          ]);
        } catch {
          // Consent already recorded server-side; client call is supplementary
        }

        navigation.reset({
          index: 0,
          routes: [{ name: 'Onboarding' }],
        });
      } else {
        Alert.alert(
          t.auth.register,
          (typeof response.error === 'string' ? response.error : response.error?.message) || t.common.retry,
        );
      }
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      Alert.alert(t.auth.register, message);
    } finally {
      setIsLoading(false);
    }
  }, [email, nickname, password, confirmPassword, validateInputs, setToken, setUser, navigation]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            disabled={isLoading}
            accessibilityLabel={t.common.back}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>{t.auth.register}</Text>
          <Text style={styles.subtitle}>开始您的智能穿搭之旅</Text>
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
                editable={!isLoading}
                returnKeyType="next"
                onSubmitEditing={() => nicknameInputRef.current?.focus()}
              />
            </View>

            <View style={styles.inputGroup}>
              <Ionicons name="person-outline" size={20} color={colors.textTertiary} />
              <TextInput
                ref={nicknameInputRef}
                style={styles.input}
                placeholder="昵称（选填）"
                placeholderTextColor={colors.textTertiary}
                value={nickname}
                onChangeText={setNickname}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
              />
            </View>

            <View style={styles.inputGroup}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textTertiary} />
              <TextInput
                ref={passwordInputRef}
                style={styles.input}
                placeholder={t.auth.password}
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                returnKeyType="next"
                onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((prev) => !prev)}
                style={styles.eyeButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                disabled={isLoading}
                accessibilityLabel={showPassword ? '隐藏密码' : '显示密码'}
              >
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textTertiary} />
              <TextInput
                ref={confirmPasswordInputRef}
                style={styles.input}
                placeholder="确认密码"
                placeholderTextColor={colors.textTertiary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                returnKeyType="go"
                onSubmitEditing={handleRegister}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword((prev) => !prev)}
                style={styles.eyeButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                disabled={isLoading}
                accessibilityLabel={showConfirmPassword ? '隐藏确认密码' : '显示确认密码'}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.termsRow}>
              <TouchableOpacity
                style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}
                onPress={() => setAgreedToTerms((prev) => !prev)}
                activeOpacity={0.7}
                disabled={isLoading}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel={agreedToTerms ? '取消同意' : '同意协议'}
              >
                {agreedToTerms && (
                  <Ionicons name="checkmark" size={14} color={colors.surface} />
                )}
              </TouchableOpacity>
              <Text style={styles.termsText}>我已阅读并同意</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Legal', { type: 'terms' })}
                disabled={isLoading}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Text style={styles.termsLink}>《用户服务协议》</Text>
              </TouchableOpacity>
              <Text style={styles.termsText}>和</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Legal', { type: 'privacy' })}
                disabled={isLoading}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Text style={styles.termsLink}>《隐私政策》</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.registerButton,
                (isLoading || !agreedToTerms) && styles.registerButtonDisabled,
              ]}
              onPress={handleRegister}
              disabled={isLoading || !agreedToTerms}
              activeOpacity={0.7}
              accessibilityLabel={t.auth.register}
              accessibilityState={{ disabled: isLoading || !agreedToTerms }}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={colors.surface} />
              ) : (
                <Text style={styles.registerButtonText}>{t.auth.register}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => navigation.navigate('Login')}
              disabled={isLoading}
              accessibilityLabel={t.auth.login}
            >
              <Text style={styles.loginText}>{t.auth.login}</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, padding: 20 },
  title: { fontSize: DesignTokens.typography.sizes['3xl'], fontWeight: '700', color: colors.text },
  subtitle: { fontSize: DesignTokens.typography.sizes.md, color: colors.textSecondary, marginTop: 8, marginBottom: 32 },
  form: { gap: 16 },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  input: { flex: 1, fontSize: DesignTokens.typography.sizes.md, color: colors.text },
  eyeButton: { padding: 4 },
  registerButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 52,
  },
  registerButtonDisabled: { backgroundColor: colors.primaryLight },
  registerButtonText: { fontSize: DesignTokens.typography.sizes.md, fontWeight: '600', color: colors.surface },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 4,
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: colors.surface,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  termsText: { fontSize: DesignTokens.typography.sizes.sm, color: colors.textSecondary },
  termsLink: { fontSize: DesignTokens.typography.sizes.sm, color: colors.primary, fontWeight: '500' },
  loginLink: { alignItems: 'center', marginTop: 16 },
  loginText: { fontSize: DesignTokens.typography.sizes.base, color: colors.primary },
});

export default RegisterScreen;
