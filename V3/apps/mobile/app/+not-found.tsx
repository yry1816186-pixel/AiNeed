import { View, Text, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { colors, typography, spacing } from '../src/theme';

export default function NotFoundScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.code}>404</Text>
      <Text style={styles.message}>页面不存在</Text>
      <Link href="/" style={styles.link}>
        <Text style={styles.linkText}>返回首页</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  code: {
    ...typography.h1,
    fontSize: 48,
    color: colors.textDisabled,
  },
  message: {
    ...typography.body,
    color: colors.textTertiary,
    marginTop: spacing.md,
  },
  link: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: 8,
  },
  linkText: {
    ...typography.button,
    color: colors.textInverse,
  },
});
