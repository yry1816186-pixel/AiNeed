import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  StyleSheet,
  Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Svg, Path } from 'react-native-svg';
import { useClothingDetail } from '../../src/hooks/useClothingDetail';
import { ImageCarousel } from '../../src/components/clothing/ImageCarousel';
import { ColorChips } from '../../src/components/clothing/ColorChips';
import { StyleTags } from '../../src/components/clothing/StyleTags';
import { SimilarItems } from '../../src/components/clothing/SimilarItems';
import { Loading } from '../../src/components/ui/Loading';
import { colors, spacing, radius, typography, shadows } from '../../src/theme';

const SIZE_OPTIONS = ['S', 'M', 'L', 'XL', 'XXL'] as const;

function HeartIcon({ filled, size = 22 }: { filled: boolean; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? colors.accent : 'none'}>
      <Path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
        stroke={filled ? colors.accent : colors.gray500}
        strokeWidth={1.8}
      />
    </Svg>
  );
}

function WardrobeIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a4 4 0 00-8 0v2"
        stroke={colors.gray600}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 11v4M10 13h4"
        stroke={colors.gray600}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function WardrobeFilledIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={colors.primary}>
      <Path
        d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a4 4 0 00-8 0v2"
        stroke={colors.primary}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M12 11v4M10 13h4"
        stroke={colors.white}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function ClothingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    clothing,
    isLoading,
    isError,
    refetch,
    similarItems,
    toggleFavorite,
    isFavoriteLoading,
    addToWardrobe,
    isWardrobeLoading,
  } = useClothingDetail(id);

  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const handleToggleFavorite = useCallback(() => {
    if (!clothing) return;
    toggleFavorite({ clothingId: clothing.id, isFavorited: clothing.isFavorited });
  }, [clothing, toggleFavorite]);

  const handleAddToWardrobe = useCallback(() => {
    if (!clothing) return;
    if (clothing.isInWardrobe) {
      Alert.alert('提示', '该服装已在衣橱中');
      return;
    }
    addToWardrobe(clothing.id);
  }, [clothing, addToWardrobe]);

  const handlePurchase = useCallback(() => {
    if (!clothing?.purchaseUrl) {
      Alert.alert('提示', '暂无购买链接');
      return;
    }
    Linking.openURL(clothing.purchaseUrl).catch(() => {
      Alert.alert('提示', '无法打开购买链接');
    });
  }, [clothing]);

  const handleTryOn = useCallback(() => {
    Alert.alert('试穿功能', '虚拟试穿功能即将上线');
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <Loading variant="fullscreen" message="加载中..." />
      </SafeAreaView>
    );
  }

  if (isError || !clothing) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>加载失败</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryText}>重试</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const discount = clothing.originalPrice
    ? Math.round((1 - clothing.price / clothing.originalPrice) * 100)
    : 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollInner}
        >
          <ImageCarousel images={clothing.images} />

          <View style={styles.infoSection}>
            <View style={styles.priceRow}>
              <Text style={styles.price}>¥{clothing.price}</Text>
              {clothing.originalPrice && clothing.originalPrice > clothing.price && (
                <>
                  <Text style={styles.originalPrice}>¥{clothing.originalPrice}</Text>
                  {discount > 0 && (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountText}>-{discount}%</Text>
                    </View>
                  )}
                </>
              )}
            </View>

            <Text style={styles.name}>{clothing.name}</Text>

            <TouchableOpacity
              style={styles.brandRow}
              onPress={() => {}}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`品牌: ${clothing.brand.name}`}
            >
              {clothing.brand.logoUrl ? (
                <View style={styles.brandLogo}>
                  <Text style={styles.brandLogoText}>
                    {clothing.brand.name.charAt(0)}
                  </Text>
                </View>
              ) : (
                <View style={styles.brandLogoPlaceholder}>
                  <Text style={styles.brandLogoPlaceholderText}>
                    {clothing.brand.name.charAt(0)}
                  </Text>
                </View>
              )}
              <Text style={styles.brandName}>{clothing.brand.name}</Text>
              <Svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <Path
                  d="M9 18l6-6-6-6"
                  stroke={colors.textTertiary}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <View style={styles.selectionSection}>
            <ColorChips
              colors={clothing.colors}
              selectedColor={selectedColor}
              onSelectColor={setSelectedColor}
            />

            <View style={styles.sizeSection}>
              <Text style={styles.sizeLabel}>尺码</Text>
              <View style={styles.sizeRow}>
                {SIZE_OPTIONS.map((size) => {
                  const isAvailable = clothing.sizes.includes(size);
                  const isSelected = selectedSize === size;
                  return (
                    <TouchableOpacity
                      key={size}
                      style={[
                        styles.sizeChip,
                        isSelected && styles.sizeChipSelected,
                        !isAvailable && styles.sizeChipDisabled,
                      ]}
                      onPress={() => isAvailable && setSelectedSize(size)}
                      disabled={!isAvailable}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`尺码: ${size}`}
                      accessibilityState={{ selected: isSelected, disabled: !isAvailable }}
                    >
                      <Text
                        style={[
                          styles.sizeChipText,
                          isSelected && styles.sizeChipTextSelected,
                          !isAvailable && styles.sizeChipTextDisabled,
                        ]}
                      >
                        {size}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.tagsSection}>
            <StyleTags
              styleTags={clothing.styleTags}
              occasionTags={clothing.occasionTags}
              seasonTags={clothing.seasonTags}
              material={clothing.material}
            />
          </View>

          {clothing.description && (
            <>
              <View style={styles.divider} />
              <View style={styles.descriptionSection}>
                <Text style={styles.descriptionTitle}>商品详情</Text>
                <Text style={styles.descriptionText}>{clothing.description}</Text>
              </View>
            </>
          )}

          <View style={styles.divider} />

          <SimilarItems title="搭配灵感" items={similarItems.slice(0, 5)} />
          <SimilarItems title="看了又看" items={similarItems.slice(5)} />

          <View style={styles.bottomSpacer} />
        </ScrollView>

        <View style={styles.bottomBar}>
          <View style={styles.bottomBarLeft}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleToggleFavorite}
              disabled={isFavoriteLoading}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={clothing.isFavorited ? '取消收藏' : '收藏'}
            >
              <HeartIcon filled={clothing.isFavorited} />
              <Text style={styles.iconButtonLabel}>
                {clothing.isFavorited ? '已收藏' : '收藏'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleAddToWardrobe}
              disabled={isWardrobeLoading}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={clothing.isInWardrobe ? '已在衣橱' : '加入衣橱'}
            >
              {clothing.isInWardrobe ? (
                <WardrobeFilledIcon />
              ) : (
                <WardrobeIcon />
              )}
              <Text style={styles.iconButtonLabel}>
                {clothing.isInWardrobe ? '已在衣橱' : '衣橱'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomBarRight}>
            <TouchableOpacity
              style={styles.tryOnButton}
              onPress={handleTryOn}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="试穿"
            >
              <Text style={styles.tryOnButtonText}>试穿</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.buyButton}
              onPress={handlePurchase}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="购买"
            >
              <Text style={styles.buyButtonText}>购买</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    paddingBottom: 0,
  },
  infoSection: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  price: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.accent,
    lineHeight: 36,
  },
  originalPrice: {
    fontSize: 16,
    color: colors.textDisabled,
    textDecorationLine: 'line-through',
    lineHeight: 22,
  },
  discountBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    backgroundColor: `${colors.accent}15`,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.accent,
    lineHeight: 16,
  },
  name: {
    ...typography.h2,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  brandLogo: {
    width: 24,
    height: 24,
    borderRadius: radius.xs,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogoText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
    lineHeight: 16,
  },
  brandLogoPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: radius.xs,
    backgroundColor: colors.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogoPlaceholderText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    lineHeight: 16,
  },
  brandName: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
    marginHorizontal: spacing.xl,
    marginTop: spacing.xl,
  },
  selectionSection: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
  },
  sizeSection: {
    marginTop: spacing.md,
  },
  sizeLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  sizeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sizeChip: {
    width: 48,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.gray200,
  },
  sizeChipSelected: {
    backgroundColor: `${colors.accent}10`,
    borderColor: colors.accent,
    borderWidth: 1.5,
  },
  sizeChipDisabled: {
    backgroundColor: colors.gray50,
    borderColor: colors.gray100,
    opacity: 0.5,
  },
  sizeChipText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  sizeChipTextSelected: {
    color: colors.accent,
    fontWeight: '700',
  },
  sizeChipTextDisabled: {
    color: colors.textDisabled,
  },
  tagsSection: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
  },
  descriptionSection: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
  },
  descriptionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  descriptionText: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  bottomSpacer: {
    height: 80,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    ...shadows.sm,
  },
  bottomBarLeft: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 2,
  },
  iconButtonLabel: {
    fontSize: 10,
    color: colors.textTertiary,
    lineHeight: 14,
  },
  bottomBarRight: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginLeft: spacing.md,
  },
  tryOnButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
  },
  tryOnButtonText: {
    ...typography.buttonSmall,
    color: colors.white,
  },
  buyButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
  },
  buyButtonText: {
    ...typography.buttonSmall,
    color: colors.white,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  errorText: {
    ...typography.body,
    color: colors.textTertiary,
  },
  retryButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
  },
  retryText: {
    ...typography.buttonSmall,
    color: colors.white,
  },
});
