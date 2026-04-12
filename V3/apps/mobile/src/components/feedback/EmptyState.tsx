import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Svg, Path, Circle } from 'react-native-svg';
import { colors, spacing } from '../../theme';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';

export type EmptyScene = 'wardrobe' | 'search' | 'messages' | 'orders' | 'favorites';

interface EmptyStateProps {
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  illustration?: EmptyScene;
  style?: StyleProp<ViewStyle>;
}

const WardrobeIllustration: React.FC = () => (
  <Svg width={120} height={120} viewBox="0 0 120 120" fill="none">
    <Path
      d="M60 18C56.6863 18 54 20.6863 54 24V36H42L60 54L78 36H66V24C66 20.6863 63.3137 18 60 18Z"
      stroke={colors.gray300}
      strokeWidth={3}
      strokeLinejoin="round"
    />
    <Path
      d="M30 60H90V98H30V60Z"
      stroke={colors.gray300}
      strokeWidth={3}
      strokeLinejoin="round"
    />
    <Path d="M60 60V98" stroke={colors.gray200} strokeWidth={2} />
  </Svg>
);

const SearchIllustration: React.FC = () => (
  <Svg width={120} height={120} viewBox="0 0 120 120" fill="none">
    <Circle cx={52} cy={52} r={24} stroke={colors.gray300} strokeWidth={3} fill="none" />
    <Path d="M70 70L96 96" stroke={colors.gray300} strokeWidth={5} strokeLinecap="round" />
    <Path d="M44 50H60" stroke={colors.gray200} strokeWidth={2.5} strokeLinecap="round" />
    <Path d="M44 58H54" stroke={colors.gray200} strokeWidth={2.5} strokeLinecap="round" />
  </Svg>
);

const MessagesIllustration: React.FC = () => (
  <Svg width={120} height={120} viewBox="0 0 120 120" fill="none">
    <Path
      d="M24 30H96C98.2091 30 100 31.7909 100 34V78C100 80.2091 98.2091 82 96 82H40L24 96V34C24 31.7909 25.7909 30 28 30Z"
      stroke={colors.gray300}
      strokeWidth={3}
      strokeLinejoin="round"
    />
    <Path d="M40 50H84" stroke={colors.gray200} strokeWidth={2.5} strokeLinecap="round" />
    <Path d="M40 62H68" stroke={colors.gray200} strokeWidth={2.5} strokeLinecap="round" />
  </Svg>
);

const OrdersIllustration: React.FC = () => (
  <Svg width={120} height={120} viewBox="0 0 120 120" fill="none">
    <Path
      d="M36 28H84L80 98H40L36 28Z"
      stroke={colors.gray300}
      strokeWidth={3}
      strokeLinejoin="round"
    />
    <Path
      d="M48 28C48 21.3726 53.3726 16 60 16C66.6274 16 72 21.3726 72 28"
      stroke={colors.gray300}
      strokeWidth={3}
      strokeLinecap="round"
    />
    <Path d="M46 50H74" stroke={colors.gray200} strokeWidth={2.5} strokeLinecap="round" />
    <Path d="M48 66H72" stroke={colors.gray200} strokeWidth={2.5} strokeLinecap="round" />
  </Svg>
);

const FavoritesIllustration: React.FC = () => (
  <Svg width={120} height={120} viewBox="0 0 120 120" fill="none">
    <Path
      d="M60 95C60 95 20 70 20 45C20 32.85 29.85 23 42 23C49.2 23 55.5 26.6 60 32C64.5 26.6 70.8 23 78 23C90.15 23 100 32.85 100 45C100 70 60 95 60 95Z"
      stroke={colors.gray300}
      strokeWidth={3}
      strokeLinejoin="round"
    />
  </Svg>
);

const illustrations: Record<EmptyScene, React.FC> = {
  wardrobe: WardrobeIllustration,
  search: SearchIllustration,
  messages: MessagesIllustration,
  orders: OrdersIllustration,
  favorites: FavoritesIllustration,
};

const sceneDefaults: Record<EmptyScene, { title: string; message: string }> = {
  wardrobe: { title: '衣橱空空如也', message: '添加你的第一件衣物吧' },
  search: { title: '没有找到结果', message: '试试其他关键词' },
  messages: { title: '暂无消息', message: '还没有收到任何消息' },
  orders: { title: '暂无订单', message: '去逛逛有什么喜欢的' },
  favorites: { title: '暂无收藏', message: '收藏喜欢的穿搭灵感' },
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  actionLabel,
  onAction,
  illustration,
  style,
}) => {
  const scene = illustration ?? 'search';
  const defaults = sceneDefaults[scene];
  const displayTitle = title ?? defaults.title;
  const displayMessage = message ?? defaults.message;
  const Illustration = illustrations[scene];

  return (
    <View style={[styles.container, style]}>
      <Illustration />
      <Text variant="h3" align="center" style={styles.title}>
        {displayTitle}
      </Text>
      <Text variant="body2" color={colors.textTertiary} align="center" style={styles.message}>
        {displayMessage}
      </Text>
      {actionLabel && onAction && (
        <Button variant="primary" size="medium" onPress={onAction} style={styles.action}>
          {actionLabel}
        </Button>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
  },
  title: {
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
  },
  message: {
    maxWidth: 260,
    marginBottom: spacing.xl,
  },
  action: {
    marginTop: spacing.lg,
  },
});
