import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../../src/theme';

export default function ActionsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>快捷操作</Text>
      <Text style={styles.subtitle}>选择一个操作开始</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.bodySmall,
    color: colors.textTertiary,
    marginTop: spacing.sm,
  },
});
