import { useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
} from 'react-native';
import { Ionicons } from '@/src/polyfills/expo-vector-icons';
import { LinearGradient } from '@/src/polyfills/expo-linear-gradient';
import { DesignTokens } from '../../../theme/tokens/design-tokens';

interface ProfileCompletionBannerProps {
  completionPercent: number;
  isComplete: boolean;
  onDismiss: () => void;
  onContinue: () => void;
}

const ProfileCompletionBanner = memo(
  ({ completionPercent, isComplete, onDismiss, onContinue }: ProfileCompletionBannerProps) => {
    const [visible, setVisible] = useState(true);

    const handleDismiss = useCallback(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setVisible(false);
      onDismiss();
    }, [onDismiss]);

    if (!visible) {
      return null;
    }

    if (isComplete) {
      return (
        <View style={styles.container}>
          <LinearGradient
            colors={[DesignTokens.colors.semantic.successLight, DesignTokens.colors.backgrounds.elevated]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.completeGradient}
          >
            <View style={styles.completeContent}>
              <View style={styles.completeIconCircle}>
                <Ionicons name="checkmark-circle" size={24} color={DesignTokens.colors.semantic.success} />
              </View>
              <View style={styles.textArea}>
                <Text style={styles.completeTitle}>你的风格画像已就绪 ✓</Text>
                <Text style={styles.completeSubtitle}>个性化推荐已全面开启</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={handleDismiss}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="关闭"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={18} color={DesignTokens.colors.text.tertiary} />
            </TouchableOpacity>
          </LinearGradient>
        </View>
      );
    }

    const clampedPercent = Math.min(100, Math.max(0, completionPercent));

    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.textArea}>
              <Text style={styles.title}>完善画像解锁个性化推荐</Text>
              <Text style={styles.percentText}>{clampedPercent}% 已完成</Text>
            </View>
            <TouchableOpacity
              onPress={handleDismiss}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="关闭"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={18} color={DesignTokens.colors.text.tertiary} />
            </TouchableOpacity>
          </View>
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={[DesignTokens.colors.brand.terracotta, DesignTokens.colors.brand.camel]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${clampedPercent}%` }]}
            />
          </View>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={onContinue}
            activeOpacity={0.8}
            accessibilityLabel="继续完善"
            accessibilityRole="button"
          >
            <Text style={styles.ctaText}>继续完善</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  },
);

ProfileCompletionBanner.displayName = 'ProfileCompletionBanner';

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: DesignTokens.colors.backgrounds.elevated,
    borderRadius: 16,
    padding: 16,
    ...DesignTokens.shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  textArea: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: DesignTokens.colors.text.primary,
    marginBottom: 4,
  },
  percentText: {
    fontSize: 13,
    color: DesignTokens.colors.text.tertiary,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: DesignTokens.colors.neutral[200],
    marginBottom: 14,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  ctaButton: {
    backgroundColor: DesignTokens.colors.brand.terracotta,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
  },
  ctaText: {
    color: DesignTokens.colors.text.inverse,
    fontSize: 14,
    fontWeight: '600',
  },
  completeGradient: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...DesignTokens.shadows.sm,
  },
  completeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  completeIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: DesignTokens.colors.semantic.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  completeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: DesignTokens.colors.semantic.success,
    marginBottom: 2,
  },
  completeSubtitle: {
    fontSize: 13,
    color: DesignTokens.colors.text.tertiary,
  },
});

export { ProfileCompletionBanner };
export type { ProfileCompletionBannerProps };
