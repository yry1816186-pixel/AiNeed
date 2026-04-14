import React from 'react';
import { View, Text, StyleSheet, Image, Animated, ViewStyle } from 'react-native';
import { LinearGradient } from '@/src/polyfills/expo-linear-gradient';
import { Colors, Spacing, BorderRadius, gradients } from '../../theme';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  source?: string;
  name?: string;
  size?: AvatarSize;
  online?: boolean;
  style?: ViewStyle;
}

const sizeMap: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
};

const onlineDotSize: Record<AvatarSize, number> = {
  xs: 6,
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
};

export const Avatar: React.FC<AvatarProps> = ({
  source,
  name,
  size = 'md',
  online,
  style,
}) => {
  const avatarSize = sizeMap[size];
  const dotSize = onlineDotSize[size];
  const initial = name?.charAt(0)?.toUpperCase() || '?';

  const renderAvatar = () => {
    if (source) {
      return (
        <Image
          source={{ uri: source }}
          style={[styles.image, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
          resizeMode="cover"
        />
      );
    }

    return (
      <LinearGradient
        colors={gradients.brand}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.fallback, { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }]}
      >
        <Text style={[styles.initial, { fontSize: avatarSize * 0.4 }]}>{initial}</Text>
      </LinearGradient>
    );
  };

  return (
    <View style={[{ width: avatarSize, height: avatarSize }, style]}>
      {renderAvatar()}
      {online !== undefined && (
        <View style={[styles.onlineDot, {
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          backgroundColor: online ? Colors.semantic.success : Colors.neutral[400],
          borderWidth: 2,
          borderColor: Colors.neutral.white,
        }]} />
      )}
    </View>
  );
};

export const AvatarGroup: React.FC<{
  avatars: Array<{ source?: string; name?: string }>;
  size?: AvatarSize;
  max?: number;
  style?: ViewStyle;
}> = ({ avatars, size = 'md', max = 4, style }) => {
  const visible = avatars.slice(0, max);
  const remaining = avatars.length - max;
  const avatarSize = sizeMap[size];
  const overlap = avatarSize * 0.35;

  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center' }, style]}>
      {visible.map((avatar, i) => (
        <View key={i} style={{ marginLeft: i === 0 ? 0 : -overlap, zIndex: visible.length - i }}>
          <Avatar source={avatar.source} name={avatar.name} size={size} />
        </View>
      ))}
      {remaining > 0 && (
        <View style={{ marginLeft: -overlap, zIndex: 0 }}>
          <View style={[styles.overflowAvatar, {
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
          }]}>
            <Text style={[styles.overflowText, { fontSize: avatarSize * 0.3 }]}>+{remaining}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  image: { backgroundColor: Colors.neutral[100] },
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initial: { color: Colors.neutral.white, fontWeight: '700' },
  onlineDot: { position: 'absolute', bottom: 0, right: 0 },
  overflowAvatar: { backgroundColor: Colors.neutral[200], alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.neutral.white },
  overflowText: { color: Colors.neutral[600], fontWeight: '600' },
});

export default Avatar;
