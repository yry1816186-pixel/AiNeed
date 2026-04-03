import React, { useState, useCallback } from 'react';
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
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@/src/polyfills/expo-vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../services/api/auth.api';
import { useAuthStore } from '../stores/index';
import { theme } from '../theme';
import type { RootStackParamList } from '../types/navigation';

type LoginNavigationProp = NavigationProp<RootStackParamList>;

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<LoginNavigationProp>();
  const { setUser, setToken } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const validateInputs = useCallback((): string | null => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      return '请输入邮箱地址';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return '请输入有效的邮箱地址';
    }
    if (!password) {
      return '请输入密码';
    }
    if (password.length < 6) {
      return '密码至少需要6个字符';
    }
    return null;
  }, [email, password]);

  const getErrorMessage = (error: unknown): string => {
    if (typeof error === 'object' && error !== null) {
      const err = error as Record<string, unknown>;
      if (typeof err.response === 'object' && err.response !== null) {
        const response = err.response as Record<string, unknown>;
        if (typeof response.data === 'object' && response.data !== null) {
          const data = response.data as Record<string, unknown>;
          if (typeof data.error === 'string') return data.error;
        }
      }
      if (typeof err.message === 'string') return err.message;
    }
    return '网络连接失败，请检查网络后重试';
  };

  const handleLogin = useCallback(async () => {
    Keyboard.dismiss();

    const validationError = validateInputs();
    if (validationError) {
      Alert.alert('输入错误', validationError);
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
        setToken(token);
        setUser(user);

        const onboardingComplete = await AsyncStorage.getItem('@aineed:onboarding_complete');
        if (onboardingComplete === 'true') {
          navigation.reset({
            index: 0,
            routes: [{ name: 'MainTabs' }],
          });
        } else {
          navigation.reset({
            index: 0,
            routes: [{ name: 'Onboarding' }],
          });
        }
      } else {
        Alert.alert(
          '登录失败',
          (typeof response.error === 'string' ? response.error : response.error?.message) || '邮箱或密码不正确，请重试',
        );
      }
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      Alert.alert('登录失败', message);
    } finally {
      setIsLoading(false);
    }
  }, [email, password, validateInputs, setToken, setUser, navigation]);

  const handleForgotPassword = useCallback(async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      Alert.alert('提示', '请先输入邮箱地址，然后点击忘记密码');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert('提示', '请输入有效的邮箱地址');
      return;
    }

    Alert.alert(
      '重置密码',
      `将向 ${trimmedEmail} 发送密码重置链接，确认发送？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确认',
          style: 'default',
          onPress: async () => {
            try {
              const response = await authApi.forgotPassword(trimmedEmail);
              if (response.success) {
                Alert.alert(
                  '发送成功',
                  '密码重置链接已发送到您的邮箱，请查收',
                );
              } else {
                Alert.alert(
                  '发送失败',
                  (typeof response.error === 'string' ? response.error : response.error?.message) || '请稍后重试',
                );
              }
            } catch (error: unknown) {
              const message = getErrorMessage(error);
              Alert.alert('发送失败', message);
            }
          },
        },
      ],
    );
  }, [email]);

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
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.content}>
          <View style={styles.brandSection}>
            <View style={styles.logoContainer}>
              <Ionicons name="shirt-outline" size={36} color={theme.colors.surface} />
            </View>
            <Text style={styles.brandName}>AiNeed</Text>
          </View>
          <Text style={styles.title}>欢迎回来</Text>
          <Text style={styles.subtitle}>登录您的账户</Text>
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Ionicons name="mail-outline" size={20} color={theme.colors.textTertiary} />
              <TextInput
                style={styles.input}
                placeholder="邮箱地址"
                placeholderTextColor={theme.colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                returnKeyType="next"
                accessibilityLabel="邮箱地址"
                onSubmitEditing={() => {
                  if (password === '') {
                    return;
                  }
                  handleLogin();
                }}
              />
            </View>
            <View style={styles.inputGroup}>
              <Ionicons name="lock-closed-outline" size={20} color={theme.colors.textTertiary} />
              <TextInput
                style={styles.input}
                placeholder="密码"
                placeholderTextColor={theme.colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
                returnKeyType="go"
                accessibilityLabel="密码"
                onSubmitEditing={handleLogin}
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
                  color={theme.colors.textTertiary}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.forgotPasswordLink}
              onPress={handleForgotPassword}
              disabled={isLoading}
              accessibilityLabel="忘记密码"
            >
              <Text style={styles.forgotPasswordText}>忘记密码？</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.loginButton,
                isLoading && styles.loginButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.7}
              accessibilityLabel="登录"
              accessibilityRole="button"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={theme.colors.surface} />
              ) : (
                <Text style={styles.loginButtonText}>登录</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.registerLink}
              onPress={() => navigation.navigate('Register')}
              disabled={isLoading}
              accessibilityLabel="没有账户？立即注册"
            >
              <Text style={styles.registerText}>没有账户？立即注册</Text>
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
    backgroundColor: '#F1F3F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, padding: 20 },
  brandSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: theme.BorderRadius.xl,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  brandName: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.primary,
    letterSpacing: 1.2,
  },
  title: { fontSize: 32, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 16, color: theme.colors.textSecondary, marginTop: 8, marginBottom: 32 },
  form: { gap: 16 },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.BorderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  input: { flex: 1, fontSize: 16, color: theme.colors.text },
  eyeButton: { padding: 4 },
  forgotPasswordLink: { alignItems: 'flex-end' },
  forgotPasswordText: { fontSize: 14, color: theme.colors.primary },
  loginButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.BorderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 52,
    ...theme.Shadows.brand,
  },
  loginButtonDisabled: { backgroundColor: theme.colors.primaryLight },
  loginButtonText: { fontSize: 16, fontWeight: '600', color: theme.colors.surface },
  registerLink: { alignItems: 'center', marginTop: 16 },
  registerText: { fontSize: 14, color: theme.colors.primary },
});

export default LoginScreen;
