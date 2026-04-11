import React, { useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { colors, spacing, radius, shadows, typography } from '../../theme';
import { Text } from '../ui/Text';
import { Badge } from '../ui/Badge';
import type { WardrobeItem } from '../../services/wardrobe.service';

interface ClothingGridItemProps {
  item: WardrobeItem;
  onPress: (item: WardrobeItem) => void;
  onRemove: (id: string) => void;
}

export const ClothingGridItem: React.FC<ClothingGridItemProps> = ({
  item,
  onPress,
  onRemove,
}) => {
  const handleLongPress = useCallback(() => {
    Alert.alert('删除确认', `确定要将"${item.name}"从衣橱中移除吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => onRemove(item.id),
      },
    ]);
  }, [item.id, item.name, onRemove]);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(item)}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={item.name}
    >
      <View style={styles.imageContainer}>
        {item.thumbnailUrl ? (
          <View style={styles.imagePlaceholder}>
            <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <Path
                d="M4 16L8.5 11L12 14.5L16 9.5L20 14V19C20 19.5523 19.5523 20 19 20H5C4.44772 20 4 19.5523 4 19V16Z"
                fill={colors.gray300}
              />
              <Path
                d="M4 16L8.5 11L12 14.5L16 9.5L20 14"
                stroke={colors.gray400}
                strokeWidth="1.2"
              />
            </Svg>
          </View>
        ) : (
          <View
            style={[
              styles.colorPlaceholder,
              { backgroundColor: item.color.hex },
            ]}
          />
        )}
      </View>
      <View style={styles.info}>
        <Text variant="body2" numberOfLines={1} style={styles.name}>
          {item.name}
        </Text>
        <View style={styles.colorRow}>
          <View
            style={[styles.colorDot, { backgroundColor: item.color.hex }]}
          />
          <Text variant="caption" color={colors.textTertiary}>
            {item.color.name}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.md,
    overflow: 'hidden',
    ...shadows.sm,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
  },
  imagePlaceholder: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorPlaceholder: {
    flex: 1,
  },
  info: {
    padding: spacing.sm,
  },
  name: {
    lineHeight: typography.body2.lineHeight,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
