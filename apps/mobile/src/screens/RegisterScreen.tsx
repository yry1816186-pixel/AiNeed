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
import { useAuthStore } from '../stores/index';
import { theme } from '../theme';
import type { RootStackParamList } from '../types/navigation';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

function getErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    if (obj.response && typeof obj.response === 'object') {
      const resp = obj.response as Record<string, unknown>;
      if (resp.data && typeof resp.data === 'object') {
        const data = resp.data as Record<string, unknown>;
        if (typeof data.error === 'string') return data.error;
      }
    }
    if (typeof obj.message === 'string') return obj.message;
  }
  return '网络连接失败，请检查网络后重试';
}

export const RegisterScreen: React.FC = () => {
  const navigation = useNavigation<Navigation>();
  const { setUser, setToken } = useAuthStore();

  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const nicknameInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);

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
    if (!confirmPassword) {
      return '请确认密码';
    }
    if (password !== confirmPassword) {
      return '两次输入的密码不一致';
    }
    return null;
  }, [email, password, confirmPassword]);

  const handleRegister = useCallback(async () => {
    Keyboard.dismiss();

    const validationError = validateInputs();
    if (validationError) {
      Alert.alert('输入错误', validationError);
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
        navigation.reset({
          index: 0,
          routes: [{ name: 'Onboarding' }],
        });
      } else {
        Alert.alert(
          '注册失败',
          (typeof response.error === 'string' ? response.error : response.error?.message) || '注册失败，请稍后重试',
        );
      }
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      Alert.alert('注册失败', message);
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
            accessibilityLabel="返回"
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>创建账户</Text>
          <Text style={styles.subtitle}>开始您的智能穿搭之旅</Text>
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
                onSubmitEditing={() => nicknameInputRef.current?.focus()}
              />
            </View>

            <View style={styles.inputGroup}>
              <Ionicons name="person-outline" size={20} color={theme.colors.textTertiary} />
              <TextInput
                ref={nicknameInputRef}
                style={styles.input}
                placeholder="昵称（选填）"
                placeholderTextColor={theme.colors.textTertiary}
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
              <Ionicons name="lock-closed-outline" size={20} color={theme.colors.textTertiary} />
              <TextInput
                ref={passwordInputRef}
                style={styles.input}
                placeholder="密码"
                placeholderTextColor={theme.colors.textTertiary}
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
                  color={theme.colors.textTertiary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Ionicons name="lock-closed-outline" size={20} color={theme.colors.textTertiary} />
              <TextInput
                ref={confirmPasswordInputRef}
                style={styles.input}
                placeholder="确认密码"
                placeholderTextColor={theme.colors.textTertiary}
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
                  color={theme.colors.textTertiary}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.registerButton,
                isLoading && styles.registerButtonDisabled,
              ]}
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.7}
              accessibilityLabel="注册"
              accessibilityState={{ disabled: isLoading }}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={theme.colors.surface} />
              ) : (
                <Text style={styles.registerButtonText}>注册</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => navigation.navigate('Login')}
              disabled={isLoading}
              accessibilityLabel="已有账户，立即登录"
            >
              <Text style={styles.loginText}>已有账户？立即登录</Text>
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
  title: { fontSize: 32, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 16, color: theme.colors.textSecondary, marginTop: 8, marginBottom: 32 },
  form: { gap: 16 },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  input: { flex: 1, fontSize: 16, color: theme.colors.text },
  eyeButton: { padding: 4 },
  registerButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    minHeight: 52,
  },
  registerButtonDisabled: { backgroundColor: theme.colors.primaryLight },
  registerButtonText: { fontSize: 16, fontWeight: '600', color: theme.colors.surface },
  loginLink: { alignItems: 'center', marginTop: 16 },
  loginText: { fontSize: 14, color: theme.colors.primary },
});

export default RegisterScreen;
