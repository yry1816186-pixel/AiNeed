import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useAuthStore } from '../../src/stores/auth.store';
import type { AuthState } from '../../src/stores/auth.store';
import { colors, typography, spacing, radius } from '../../src/theme';
import { Text } from '../../src/components/ui/Text';

const CODE_LENGTH = 6;
const COUNTDOWN_SECONDS = 60;

function BackIcon() {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 19L8 12L15 5"
        stroke={colors.textPrimary}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function VerifyScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [isResending, setIsResending] = useState(false);
  const login = useAuthStore((s: AuthState) => s.login);
  const sendCode = useAuthStore((s: AuthState) => s.sendCode);
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleVerify = useCallback(async (value: string) => {
    if (value.length !== CODE_LENGTH || isVerifying) return;
    setIsVerifying(true);
    try {
      await login(phone ?? '', value);
      router.replace('/onboarding');
    } catch {
      setCode('');
      inputRef.current?.focus();
    } finally {
      setIsVerifying(false);
    }
  }, [isVerifying, login, phone, router]);

  const handleCodeChange = useCallback((text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    if (digits.length === CODE_LENGTH) {
      handleVerify(digits);
    }
  }, [handleVerify]);

  const handleResend = useCallback(async () => {
    if (countdown > 0 || isResending) return;
    setIsResending(true);
    try {
      await sendCode(phone ?? '');
      setCountdown(COUNTDOWN_SECONDS);
    } catch {
      // 用户可重试
    } finally {
      setIsResending(false);
    }
  }, [countdown, isResending, sendCode, phone]);

  const maskedPhone = phone
    ? phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
    : '';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        activeOpacity={0.7}
        accessibilityLabel="返回"
      >
        <BackIcon />
      </TouchableOpacity>

      <View style={styles.content}>
        <Animated.View entering={FadeInUp.duration(500).springify()} style={styles.headerSection}>
          <Text variant="h2" style={styles.title}>输入验证码</Text>
          <Text variant="body" color={colors.textTertiary} style={styles.subtitle}>
            验证码已发送至 {maskedPhone}
          </Text>
        </Animated.View>

        <TextInput
          ref={inputRef}
          style={styles.hiddenInput}
          keyboardType="number-pad"
          maxLength={CODE_LENGTH}
          value={code}
          onChangeText={handleCodeChange}
          autoFocus
          accessibilityLabel="验证码输入"
        />

        <Animated.View entering={FadeInDown.duration(500).delay(150).springify()} style={styles.codeSection}>
          <TouchableOpacity
            style={styles.codeContainer}
            activeOpacity={1}
            onPress={() => inputRef.current?.focus()}
          >
            {Array.from({ length: CODE_LENGTH }).map((_, i) => {
              const isFilled = i < code.length;
              const isCurrent = i === code.length;
              return (
                <View
                  key={i}
                  style={[
                    styles.codeBox,
                    isCurrent && styles.codeBoxActive,
                    isFilled && styles.codeBoxFilled,
                  ]}
                >
                  <Text variant="h2" style={styles.codeChar}>
                    {code[i] ?? ''}
                  </Text>
                </View>
              );
            })}
          </TouchableOpacity>

          <View style={styles.resendRow}>
            {countdown > 0 ? (
              <Text variant="bodySmall" color={colors.textDisabled}>
                {countdown}秒后重新发送
              </Text>
            ) : (
              <TouchableOpacity
                onPress={handleResend}
                disabled={isResending}
                activeOpacity={0.7}
              >
                <Text variant="bodySmall" color={colors.accent}>
                  {isResending ? '发送中...' : '重新发送'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  backButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.xl,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },
  headerSection: {
    marginBottom: spacing.xxxl,
  },
  title: {
    marginBottom: spacing.sm,
  },
  subtitle: {
    lineHeight: 22,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  codeSection: {
    gap: spacing.xxl,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  codeBox: {
    width: 48,
    height: 56,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  codeBoxActive: {
    borderColor: colors.accent,
    borderBottomWidth: 2,
  },
  codeBoxFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.gray50,
  },
  codeChar: {
    color: colors.textPrimary,
  },
  resendRow: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
});
