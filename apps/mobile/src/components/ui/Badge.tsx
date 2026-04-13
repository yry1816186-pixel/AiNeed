import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing } from '../../theme/spacing';

export type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral' | 'gold' | 'season';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps {
  text: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export type ColorSeasonKey = 'spring' | 'summer' | 'autumn' | 'winter';

export interface SeasonBadgeProps {
  season: ColorSeasonKey;
  size?: BadgeSize;
  style?: ViewStyle;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  primary: { bg: colors.primary[100], text: colors.primary[700] },
  secondary: { bg: colors.secondary[100], text: colors.secondary[700] },
  success: { bg: colors.semantic.successLight, text: '#1B7A3D' },
  warning: { bg: colors.semantic.warningLight, text: '#8B6914' },
  error: { bg: colors.semantic.errorLight, text: '#A12525' },
  neutral: { bg: colors.neutral[100], text: colors.neutral[700] },
  gold: { bg: colors.gold[100], text: colors.gold[700] },
  season: { bg: colors.neutral[50], text: colors.primary[500] },
};

const sizeStyles: Record<BadgeSize, { paddingHorizontal: number; paddingVertical: number; fontSize: number; borderRadius: number }> = {
  sm: { paddingHorizontal: spacing.scale[2], paddingVertical: spacing.scale[1], fontSize: typography.fontSize['2xs'], borderRadius: spacing.borderRadius.sm },
  md: { paddingHorizontal: spacing.aliases.sm, paddingVertical: spacing.scale[2], fontSize: typography.fontSize.xs, borderRadius: spacing.borderRadius.md },
  lg: { paddingHorizontal: spacing.aliases.md, paddingVertical: spacing.aliases.sm, fontSize: typography.fontSize.sm, borderRadius: spacing.borderRadius.lg },
};

export const Badge: React.FC<BadgeProps> = ({
  text,
  variant = 'primary',
  size = 'md',
  icon,
  onPress,
  style,
  textStyle,
}) => {
  const vStyle = variantStyles[variant];
  const sStyle = sizeStyles[size];

  const content = (
    <View style={[styles.badge, { backgroundColor: vStyle.bg, paddingHorizontal: sStyle.paddingHorizontal, paddingVertical: sStyle.paddingVertical, borderRadius: sStyle.borderRadius }, style]}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={[{ fontSize: sStyle.fontSize, color: vStyle.text, fontWeight: '600' }, textStyle]}>
        {text}
      </Text>
    </View>
  );

  if (onPress) {
    return <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{content}</TouchableOpacity>;
  }

  return content;
};

export const SeasonBadge: React.FC<SeasonBadgeProps> = ({ season, size = 'md', style }) => {
  const seasonData = colors.colorSeasons[season];
  const sStyle = sizeStyles[size];

  return (
    <View style={[styles.seasonBadge, { backgroundColor: seasonData.bg, paddingHorizontal: sStyle.paddingHorizontal, paddingVertical: sStyle.paddingVertical, borderRadius: sStyle.borderRadius }, style]}>
      <View style={styles.seasonDots}>
        {seasonData.colors.slice(0, 3).map((color, i) => (
          <View key={i} style={[styles.seasonDot, { backgroundColor: color }]} />
        ))}
      </View>
      <Text style={{ fontSize: sStyle.fontSize, color: colors.primary[700], fontWeight: '600' }}>
        {seasonData.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  iconContainer: { marginRight: spacing.scale[1] },
  seasonBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  seasonDots: { flexDirection: 'row', marginRight: spacing.scale[2] },
  seasonDot: { width: 8, height: 8, borderRadius: 4, marginRight: 2 },
});

export default Badge;
