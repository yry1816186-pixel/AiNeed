import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@/src/polyfills/expo-vector-icons';
import { LinearGradient } from '@/src/polyfills/expo-linear-gradient';
import Animated, { FadeInUp } from 'react-native-reanimated';

// 引入主题令牌
import { colors } from '../../theme/tokens/colors';
import { typography } from '../../theme/tokens/typography';
import { spacing } from '../../theme/tokens/spacing';
import { shadows } from '../../theme/tokens/shadows';

interface OutfitCardProps {
  id: string;
  image: string;
  title: string;
  subtitle?: string;
  tag?: string;
  tagColor?: string;
  price?: number;
  onPress: (id: string) => void;
  onFavorite?: (id: string) => void;
  isFavorite?: boolean;
}

/**
 * OutfitCard - 国赛一等奖水准穿搭推荐卡片
 *
 * 设计特点：
 * - 大图展示 + 圆角设计
 * - 彩色标签系统（热门/推荐/新品）
 * - 收藏按钮（心形图标）
 * - 价格展示（可选）
 * - 入场动画 (FadeInUp)
 */
export const OutfitCard: React.FC<OutfitCardProps> = ({
  id,
  image,
  title,
  subtitle,
  tag,
  tagColor = colors.warmPrimary.coral[500],
  price,
  onPress,
  onFavorite,
  isFavorite = false,
}) => {
  return (
    <Animated.View entering={FadeInUp.duration(400).springify()}>
      <TouchableOpacity
        style={styles.card}
        onPress={() => onPress(id)}
        activeOpacity={0.8}
      >
        {/* 图片容器 */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: image }} style={styles.image} />

          {/* 标签 */}
          {tag && (
            <LinearGradient
              colors={[tagColor, tagColor]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.tag]}
            >
              <Text style={styles.tagText}>{tag}</Text>
            </LinearGradient>
          )}

          {/* 收藏按钮 */}
          {onFavorite && (
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={() => onFavorite(id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isFavorite ? 'heart' : 'heart-outline'}
                size={20}
                color={isFavorite ? colors.warmPrimary.coral[500] : '#FFFFFF'}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* 信息区域 */}
        <View style={styles.infoContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}

          {/* 价格 */}
          {price !== undefined && (
            <Text style={styles.price}>¥{price.toFixed(2)}</Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 140,
    marginRight: 16,
    backgroundColor: colors.neutral.white,
    borderRadius: spacing.borderRadius['2xl'],
    overflow: 'hidden',
    ...shadows.presets.md,
  },
  imageContainer: {
    position: 'relative',
  },
  image: {
    width: 140,
    height: 180,
    resizeMode: 'cover',
    backgroundColor: colors.neutral[200],
  },
  tag: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  tagText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: '#FFFFFF',
  },
  favoriteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContainer: {
    padding: 12,
  },
  title: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.neutral[900],
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.neutral[500],
    textAlign: 'center',
    marginBottom: 6,
  },
  price: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold as any,
    color: colors.warmPrimary.coral[600],
    textAlign: 'center',
  },
});

export default OutfitCard;
