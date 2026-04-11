import React, { useState, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Svg, Path, Circle, Polyline } from 'react-native-svg';
import { colors, spacing, radius, typography, shadows } from '../../theme';
import { Text } from '../ui/Text';
import type { SearchFilters as SearchFilterValues, SortOption } from '../../services/search.service';

interface SearchFiltersProps {
  filters: SearchFilterValues;
  sort: SortOption;
  onFilterChange: (filters: SearchFilterValues) => void;
  onSortChange: (sort: SortOption) => void;
  style?: StyleProp<ViewStyle>;
}

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'relevance', label: '综合' },
  { key: 'price_asc', label: '价格↑' },
  { key: 'price_desc', label: '价格↓' },
  { key: 'newest', label: '最新' },
];

const COLOR_OPTIONS = [
  { key: 'black', label: '黑色', color: '#1A1A1A' },
  { key: 'white', label: '白色', color: '#FFFFFF' },
  { key: 'red', label: '红色', color: '#E94560' },
  { key: 'blue', label: '蓝色', color: '#2196F3' },
  { key: 'green', label: '绿色', color: '#4CAF50' },
  { key: 'yellow', label: '黄色', color: '#FFC107' },
  { key: 'pink', label: '粉色', color: '#FF6B81' },
  { key: 'gray', label: '灰色', color: '#999999' },
  { key: 'brown', label: '棕色', color: '#8D6E63' },
  { key: 'beige', label: '米色', color: '#F5F0E1' },
];

const STYLE_OPTIONS = ['简约', '韩系', '国潮', '日系', '欧美', '新中式', '街头', '通勤', '休闲', '运动'];

const BRAND_OPTIONS = ['UNIQLO', 'ZARA', 'H&M', 'MUJI', '太平鸟', '波司登', '李宁', '安踏', 'Nike', 'Adidas'];

const PRICE_RANGES: { key: string; label: string; min?: number; max?: number }[] = [
  { key: 'all', label: '不限' },
  { key: '0-100', label: '¥100以下', min: 0, max: 100 },
  { key: '100-300', label: '¥100-300', min: 100, max: 300 },
  { key: '300-500', label: '¥300-500', min: 300, max: 500 },
  { key: '500-1000', label: '¥500-1000', min: 500, max: 1000 },
  { key: '1000+', label: '¥1000以上', min: 1000 },
];

export const SearchFilters: React.FC<SearchFiltersProps> = ({
  filters,
  sort,
  onFilterChange,
  onSortChange,
  style,
}) => {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [localFilters, setLocalFilters] = useState<SearchFilterValues>(filters);

  const activeFilterCount =
    (filters.colors?.length ?? 0) +
    (filters.styles?.length ?? 0) +
    (filters.brands?.length ?? 0) +
    (filters.priceMin !== undefined || filters.priceMax !== undefined ? 1 : 0);

  const handleOpenDrawer = useCallback(() => {
    setLocalFilters(filters);
    setDrawerVisible(true);
  }, [filters]);

  const handleApply = useCallback(() => {
    onFilterChange(localFilters);
    setDrawerVisible(false);
  }, [localFilters, onFilterChange]);

  const handleReset = useCallback(() => {
    setLocalFilters({});
  }, []);

  const toggleArrayFilter = useCallback(
    (key: 'colors' | 'styles' | 'brands', value: string) => {
      const current = localFilters[key] ?? [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      setLocalFilters((prev) => ({ ...prev, [key]: next.length > 0 ? next : undefined }));
    },
    [localFilters],
  );

  const handlePriceRange = useCallback((range: typeof PRICE_RANGES[number]) => {
    if (range.key === 'all') {
      setLocalFilters((prev) => {
        const { priceMin, priceMax, ...rest } = prev;
        return rest;
      });
    } else {
      setLocalFilters((prev) => ({
        ...prev,
        priceMin: range.min,
        priceMax: range.max,
      }));
    }
  }, []);

  const isPriceRangeActive = useCallback(
    (range: typeof PRICE_RANGES[number]) => {
      if (range.key === 'all') return localFilters.priceMin === undefined && localFilters.priceMax === undefined;
      return localFilters.priceMin === range.min && localFilters.priceMax === range.max;
    },
    [localFilters],
  );

  return (
    <View style={[styles.container, style]}>
      <View style={styles.sortRow}>
        {SORT_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.key}
            onPress={() => onSortChange(option.key)}
            style={[styles.sortButton, sort === option.key && styles.sortButtonActive]}
            activeOpacity={0.7}
            accessibilityRole="button"
          >
            <Text
              variant="bodySmall"
              weight={sort === option.key ? '600' : '400'}
              color={sort === option.key ? colors.accent : colors.textSecondary}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          onPress={handleOpenDrawer}
          style={styles.filterButton}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="筛选"
        >
          <Svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <Path d="M2 4H14M4 8H12M6 12H10" stroke={activeFilterCount > 0 ? colors.accent : colors.textSecondary} strokeWidth="1.5" strokeLinecap="round" />
          </Svg>
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text variant="overline" color={colors.white} weight="700">{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <Modal visible={drawerVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setDrawerVisible(false)}>
        <View style={styles.drawerContainer}>
          <View style={styles.drawerHeader}>
            <TouchableOpacity onPress={() => setDrawerVisible(false)} accessibilityRole="button">
              <Text variant="body" color={colors.textSecondary}>取消</Text>
            </TouchableOpacity>
            <Text variant="h3" weight="600">筛选</Text>
            <TouchableOpacity onPress={handleReset} accessibilityRole="button">
              <Text variant="body" color={colors.accent}>重置</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.drawerContent}>
            <View style={styles.filterSection}>
              <Text variant="body" weight="600" style={styles.filterSectionTitle}>价格范围</Text>
              <View style={styles.filterChips}>
                {PRICE_RANGES.map((range) => (
                  <TouchableOpacity
                    key={range.key}
                    onPress={() => handlePriceRange(range)}
                    style={[styles.chip, isPriceRangeActive(range) && styles.chipActive]}
                    activeOpacity={0.7}
                  >
                    <Text
                      variant="bodySmall"
                      color={isPriceRangeActive(range) ? colors.white : colors.textSecondary}
                      weight={isPriceRangeActive(range) ? '600' : '400'}
                    >
                      {range.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text variant="body" weight="600" style={styles.filterSectionTitle}>颜色</Text>
              <View style={styles.filterChips}>
                {COLOR_OPTIONS.map((color) => (
                  <TouchableOpacity
                    key={color.key}
                    onPress={() => toggleArrayFilter('colors', color.key)}
                    style={[
                      styles.colorChip,
                      localFilters.colors?.includes(color.key) && styles.colorChipActive,
                    ]}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.colorDot, { backgroundColor: color.color }, color.key === 'white' && styles.colorDotWhite]} />
                    <Text
                      variant="caption"
                      color={localFilters.colors?.includes(color.key) ? colors.accent : colors.textSecondary}
                    >
                      {color.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text variant="body" weight="600" style={styles.filterSectionTitle}>风格</Text>
              <View style={styles.filterChips}>
                {STYLE_OPTIONS.map((styleName) => (
                  <TouchableOpacity
                    key={styleName}
                    onPress={() => toggleArrayFilter('styles', styleName)}
                    style={[styles.chip, localFilters.styles?.includes(styleName) && styles.chipActive]}
                    activeOpacity={0.7}
                  >
                    <Text
                      variant="bodySmall"
                      color={localFilters.styles?.includes(styleName) ? colors.white : colors.textSecondary}
                      weight={localFilters.styles?.includes(styleName) ? '600' : '400'}
                    >
                      {styleName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text variant="body" weight="600" style={styles.filterSectionTitle}>品牌</Text>
              <View style={styles.filterChips}>
                {BRAND_OPTIONS.map((brand) => (
                  <TouchableOpacity
                    key={brand}
                    onPress={() => toggleArrayFilter('brands', brand)}
                    style={[styles.chip, localFilters.brands?.includes(brand) && styles.chipActive]}
                    activeOpacity={0.7}
                  >
                    <Text
                      variant="bodySmall"
                      color={localFilters.brands?.includes(brand) ? colors.white : colors.textSecondary}
                      weight={localFilters.brands?.includes(brand) ? '600' : '400'}
                    >
                      {brand}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.drawerFooter}>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply} activeOpacity={0.7} accessibilityRole="button">
              <Text variant="button" color={colors.white} weight="600">确定</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
    gap: spacing.xs,
  },
  sortButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
  },
  sortButtonActive: {
    backgroundColor: `${colors.accent}10`,
  },
  filterButton: {
    marginLeft: 'auto',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: radius.full,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drawerContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  drawerContent: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.xl,
    paddingBottom: 100,
  },
  filterSection: {},
  filterSectionTitle: {
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.xl,
    backgroundColor: colors.backgroundSecondary,
  },
  chipActive: {
    backgroundColor: colors.accent,
  },
  colorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
    backgroundColor: colors.backgroundSecondary,
    gap: spacing.xs,
  },
  colorChipActive: {
    backgroundColor: `${colors.accent}10`,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: radius.full,
  },
  colorDotWhite: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  drawerFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xxl,
    backgroundColor: colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  applyButton: {
    height: 48,
    borderRadius: radius.xl,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
