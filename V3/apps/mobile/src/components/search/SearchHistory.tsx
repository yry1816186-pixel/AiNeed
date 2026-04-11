import React from 'react';
import {
  View,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Svg, Path, Circle } from 'react-native-svg';
import { colors, spacing, radius, typography } from '../../theme';
import { Text } from '../ui/Text';
import { Loading } from '../ui/Loading';
import type { SearchHistoryItem } from '../../services/search.service';

interface SearchHistoryProps {
  history: SearchHistoryItem[];
  isLoading: boolean;
  onHistoryPress: (text: string) => void;
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
  style?: StyleProp<ViewStyle>;
}

export const SearchHistory: React.FC<SearchHistoryProps> = ({
  history,
  isLoading,
  onHistoryPress,
  onDeleteItem,
  onClearAll,
  style,
}) => {
  if (isLoading) {
    return (
      <View style={[styles.container, style]}>
        <Text variant="h3" style={styles.title}>搜索历史</Text>
        <Loading variant="inline" />
      </View>
    );
  }

  if (history.length === 0) {
    return null;
  }

  const renderItem = ({ item }: { item: SearchHistoryItem }) => (
    <TouchableOpacity
      style={styles.historyItem}
      onPress={() => onHistoryPress(item.text)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`搜索 ${item.text}`}
    >
      <View style={styles.historyItemLeft}>
        <Svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <Circle cx="6" cy="6" r="4.5" stroke={colors.textTertiary} strokeWidth="1.2" />
          <Path d="M9.5 9.5L13 13" stroke={colors.textTertiary} strokeWidth="1.2" strokeLinecap="round" />
        </Svg>
        <Text variant="body" color={colors.textSecondary} numberOfLines={1} style={styles.historyText}>
          {item.text}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => onDeleteItem(item.id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="删除"
      >
        <Svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <Path d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5" stroke={colors.textDisabled} strokeWidth="1.2" strokeLinecap="round" />
        </Svg>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text variant="h3" style={styles.title}>搜索历史</Text>
        <TouchableOpacity onPress={onClearAll} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="清空历史">
          <View style={styles.clearAllButton}>
            <Svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <Path d="M1.5 3H10.5M4.5 3V2C4.5 1.44772 4.94772 1 5.5 1H6.5C7.05228 1 7.5 1.44772 7.5 2V3M9 3V9.5C9 10.0523 8.55228 10.5 8 10.5H4C3.44772 10.5 3 10.0523 3 9.5V3" stroke={colors.textTertiary} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
            <Text variant="caption" color={colors.textTertiary}>清空</Text>
          </View>
        </TouchableOpacity>
      </View>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.textPrimary,
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  historyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
  },
  historyText: {
    flex: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginLeft: 22,
  },
});
