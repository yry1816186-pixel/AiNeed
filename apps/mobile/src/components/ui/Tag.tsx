import React from 'react';
import { View, Text, TouchableOpacity, ViewStyle, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius, Typography } from '../../theme';

export interface TagProps {
  text: string;
  selected?: boolean;
  onPress?: () => void;
  variant?: 'primary' | 'accent' | 'success' | 'warning' | 'error';
}

export const Tag: React.FC<TagProps> = ({
  text,
  selected = false,
  onPress,
  variant = 'primary',
}) => {
  const variantColors: Record<string, string> = {
    primary: Colors.primary[500],
    accent: Colors.accent[500],
    success: Colors.success[500],
    warning: Colors.warning[500],
    error: Colors.error[500],
  };

  const color = variantColors[variant];
  const bgColor = selected ? color : Colors.neutral[50];
  const textColor = selected ? Colors.neutral[0] : Colors.neutral[600];
  const borderColor = selected ? color : Colors.neutral[200];

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.tagBase,
        {
          backgroundColor: bgColor,
          borderWidth: selected ? 0 : 1,
          borderColor,
        },
      ]}
      activeOpacity={0.8}
    >
      <Text
        style={[
          Typography.body.sm,
          { color: textColor, fontWeight: selected ? '600' : '500' },
        ]}
      >
        {text}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  tagBase: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
});

export default Tag;
