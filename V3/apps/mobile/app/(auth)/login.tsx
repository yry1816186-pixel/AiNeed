import React, { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useAuthStore } from '../../src/stores/auth.store';
import type { AuthState } from '../../src/stores/auth.store';
import { colors, typography, spacing, radius } from '../../src/theme';
import { Text } from '../../src/components/ui/Text';
import { Button } from '../../src/components/ui/Button';

function AiNeedLogo() {
  return (
    <Svg width={64} height={64} viewBox="0 0 64 64" fill="none">
      <Defs>
        <LinearGradient id="logoGrad" x1="0" y1="0" x2="64" y2="64">
          <Stop offset="0%" stopColor={colors.accent} />
          <Stop offset="100%" stopColor={colors.accentLight} />
        </LinearGradient>
      </Defs>
      <Circle cx={32} cy={32} r={30} fill="url(#logoGrad)" />
      <Path
        d="M22 28C22 23.58 25.58 20 30 20H34C38.42 20 42 23.58 42 28V36C42 40.42 38.42 44 34 44H30C25.58 44 22 40.42 22 36V28Z"
        fill="white"
        opacity={0.9}
      />
      <Circle cx={28} cy={30} r={2.5} fill={colors.primary} />
      <Circle cx={36} cy={30} r={2.5} fill={colors.primary} />
      <Path
        d="M29 35C29 35 30.5 37 32 37C33.5 37 35 35 35 35"
        stroke={colors.primary}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Path
        d="M20 24C18 18 22 14 26 16"
        stroke="white"
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.6}
      />
      <Path
        d="M44 24C46 18 42 14 38 16"
        stroke="white"
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.6}
      />
    </Svg>
  );
}

function CheckboxIcon({ checked }: { checked: boolean }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Rect
        x={0.5}
        y={0.5}
        width={17}
        height={17}
        rx={4}
        stroke={checked ? colors.accent : colors.border}
        strokeWidth={1.5}
        fill={checked ? colors.accent : 'transparent'}
      />
      {checked && (
        <Path
          d="M5 9L7.5 11.5L13 6"
          stroke="white"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </Svg>
  );
}

function Rect(props: React.SVGProps<SVGRectElement> & { rx?: number }) {
  return <rect {...props} />;
}

const PHONE_REGEX = /^1[3-9]\d{9}$/;

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const sendCode = useAuthStore((s: AuthState) => s.sendCode);
  const router = useRouter();

  const isPhoneValid = PHONE_REGEX.test(phone);
  const canSend = isPhoneValid && agreed && !isSending;

  const handleSendCode = useCallback(async () => {
    if (!canSend) return;
    setIsSending(true);
    try {
      await sendCode(phone);
      router.push({ pathname: '/(auth)/verify', params: { phone } });
    } catch {
      // 用户可重试
    } finally {
      setIsSending(false);
    }
  }, [canSend, phone, sendCode, router]);

  const formatPhone = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 11);
    setPhone(digits);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={styles.content}>
        <Animated.View entering={FadeInUp.duration(600).springify()} style={styles.logoSection}>
          <AiNeedLogo />
          <Text variant="h1" style={styles.brandName}>AiNeed</Text>
          <Text variant="body" color={colors.textTertiary} style={styles.tagline}>AI私人造型师</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(200).springify()} style={styles.formSection}>
          <View style={styles.inputRow}>
            <View style={styles.prefix}>
              <Text variant="body" color={colors.textSecondary}>+86</Text>
            </View>
            <View style={styles.divider} />
            <TextInput
              style={styles.phoneInput}
              placeholder="请输入手机号"
              placeholderTextColor={colors.textTertiary}
              keyboardType="phone-pad"
              maxLength={11}
              value={phone}
              onChangeText={formatPhone}
              accessibilityLabel="手机号输入框"
            />
          </View>

          <Button
            variant="primary"
            size="large"
            fullWidth
            loading={isSending}
            disabled={!canSend}
            onPress={handleSendCode}
            style={styles.sendButton}
          >
            获取验证码
          </Button>

          <TouchableOpacity
            style={styles.agreementRow}
            onPress={() => setAgreed((prev) => !prev)}
            activeOpacity={0.7}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agreed }}
          >
            <CheckboxIcon checked={agreed} />
            <Text variant="caption" color={colors.textTertiary} style={styles.agreementText}>
              我已阅读并同意
              <Text variant="caption" color={colors.accent}>《用户协议》</Text>
              和
              <Text variant="caption" color={colors.accent}>《隐私政策》</Text>
            </Text>
          </TouchableOpacity>
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
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: spacing.xxxl + spacing.xl,
  },
  brandName: {
    marginTop: spacing.lg,
    color: colors.primary,
    letterSpacing: 2,
  },
  tagline: {
    marginTop: spacing.xs,
  },
  formSection: {
    gap: spacing.lg,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  prefix: {
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    height: '100%',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: colors.divider,
  },
  phoneInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: spacing.lg,
    fontSize: typography.body.fontSize,
    fontWeight: typography.body.fontWeight,
    color: colors.textPrimary,
    letterSpacing: 1,
  },
  sendButton: {
    borderRadius: radius.xl,
    marginTop: spacing.sm,
  },
  agreementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  agreementText: {
    flex: 1,
    lineHeight: 18,
  },
});
