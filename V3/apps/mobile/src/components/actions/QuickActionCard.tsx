import React, { useCallback } from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { colors, spacing, radius, typography } from '../../theme';
import { Text } from '../ui/Text';

interface QuickActionCardProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  color?: string;
}

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

export const QuickActionCard: React.FC<QuickActionCardProps> = React.memo(
  ({ icon, label, onPress, color = colors.accent }) => {
    const scale = useSharedValue(1);

    const handlePressIn = useCallback(() => {
      scale.value = withSpring(0.92, { damping: 15, stiffness: 300 });
    }, [scale]);

    const handlePressOut = useCallback(() => {
      scale.value = withSequence(
        withSpring(1.04, { damping: 12, stiffness: 250 }),
        withSpring(1, { damping: 15, stiffness: 200 }),
      );
    }, [scale]);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    return (
      <AnimatedTouchableOpacity
        style={[styles.container, animatedStyle]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <View style={[styles.iconWrapper, { backgroundColor: `${color}12` }]}>
          {icon}
        </View>
        <Text variant="caption" color={colors.textSecondary} align="center" numberOfLines={1}>
          {label}
        </Text>
      </AnimatedTouchableOpacity>
    );
  },
);

QuickActionCard.displayName = 'QuickActionCard';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
});
