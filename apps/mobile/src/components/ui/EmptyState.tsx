import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons } from '@/src/polyfills/expo-vector-icons';
import { LinearGradient } from '@/src/polyfills/expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

export interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'shirt-outline',
  title,
  subtitle,
  actionLabel,
  onAction,
  style,
}) => {
  return (
    <Animated.View entering={FadeInUp.duration(600).springify()} style={[styles.container, style]}>
      <LinearGradient
        colors={[colors.primary[50], colors.secondary[50]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconContainer}
      >
        <Ionicons name={icon as any} size={56} color={colors.secondary[400]} />
      </LinearGradient>

      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

      {actionLabel && onAction && (
        <TouchableOpacity style={styles.actionButton} onPress={onAction} activeOpacity={0.8}>
          <LinearGradient
            colors={colors.gradients.rose}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.actionGradient}
          >
            <Text style={styles.actionLabel}>{actionLabel}</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.layout.modalPadding * 2,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.layout.sectionGap,
  },
  title: {
    ...typography.styles.h4,
    color: colors.neutral[900],
    textAlign: 'center',
    marginBottom: spacing.aliases.sm,
  },
  subtitle: {
    ...typography.styles.body,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
    marginBottom: spacing.layout.sectionGap,
  },
  actionButton: {
    borderRadius: spacing.borderRadius.xl,
    overflow: 'hidden',
  },
  actionGradient: {
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  actionLabel: {
    ...typography.styles.button,
    color: colors.neutral.white,
  },
});

export default EmptyState;
