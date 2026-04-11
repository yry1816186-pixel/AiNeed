import React from 'react';
import {
  View,
  Image,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
  StyleSheet,
} from 'react-native';
import { colors, spacing, radius } from '../../theme';
import { Text } from './Text';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  size?: AvatarSize;
  source?: ImageSourcePropType;
  placeholder?: string;
  borderColor?: string;
  borderWidth?: number;
  style?: StyleProp<ViewStyle>;
}

const sizeMap: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
};

const fontSizeMap: Record<AvatarSize, number> = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 18,
  xl: 28,
};

export const Avatar: React.FC<AvatarProps> = ({
  size = 'md',
  source,
  placeholder,
  borderColor,
  borderWidth,
  style,
}) => {
  const dimension = sizeMap[size];
  const fontSize = fontSizeMap[size];

  const containerStyle = StyleSheet.flatten([
    styles.container,
    {
      width: dimension,
      height: dimension,
      borderRadius: dimension / 2,
    },
    borderColor ? { borderColor, borderWidth: borderWidth ?? 2 } : undefined,
    style,
  ]);

  if (source) {
    return (
      <View style={containerStyle}>
        <Image
          source={source}
          style={[styles.image, { borderRadius: dimension / 2 }]}
          accessibilityRole="image"
        />
      </View>
    );
  }

  const initials = placeholder
    ? placeholder.slice(0, 2).toUpperCase()
    : '?';

  return (
    <View style={[containerStyle, styles.placeholderContainer]}>
      <Text
        variant="body2"
        weight="600"
        style={[styles.placeholderText, { fontSize }]}
      >
        {initials}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: colors.gray200,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  placeholderText: {
    color: colors.white,
    lineHeight: undefined,
  },
});
