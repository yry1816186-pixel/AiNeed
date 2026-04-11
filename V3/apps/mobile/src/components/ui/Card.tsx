import React from 'react';
import {
  TouchableOpacity,
  View,
  type TouchableOpacityProps,
  type StyleProp,
  type ViewStyle,
  StyleSheet,
} from 'react-native';
import { colors, spacing, radius, shadows } from '../../theme';

interface CardProps extends Omit<TouchableOpacityProps, 'style'> {
  shadow?: keyof typeof shadows;
  borderRadius?: number;
  padding?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  shadow = 'card',
  borderRadius = radius.md,
  padding = spacing.lg,
  onPress,
  style,
  children,
  ...rest
}) => {
  const shadowStyle = shadows[shadow];

  if (onPress) {
    return (
      <TouchableOpacity
        style={[
          styles.card,
          shadowStyle,
          { borderRadius, padding },
          style,
        ]}
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        {...rest}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[
        styles.card,
        shadowStyle,
        { borderRadius, padding },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundCard,
    overflow: 'hidden',
  },
});
