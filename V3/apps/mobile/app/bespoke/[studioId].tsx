import React, { useCallback } from 'react';
import {
  View,
  ScrollView,
  Image,
  FlatList,
  StyleSheet,
  type ListRenderItemInfo,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, radius, shadows } from '../../src/theme';
import { Text } from '../../src/components/ui/Text';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { Loading } from '../../src/components/ui/Loading';
import { Empty } from '../../src/components/ui/Empty';
import {
  bespokeService,
  PRICE_RANGE_LABELS,
  type StudioReview,
} from '../../src/services/bespoke.service';

function StudioCover({ studio }: { studio: { coverImageUrl: string | null; name: string } }) {
  if (studio.coverImageUrl) {
    return <Image source={{ uri: studio.coverImageUrl }} style={styles.coverImage} />;
  }
  return (
    <View style={styles.coverPlaceholder}>
      <Text variant="h1" color={colors.white}>
        {studio.name.charAt(0)}
      </Text>
    </View>
  );
}

function StudioLogo({ studio }: { studio: { logoUrl: string | null; name: string } }) {
  if (studio.logoUrl) {
    return <Image source={{ uri: studio.logoUrl }} style={styles.logo} />;
  }
  return (
    <View style={styles.logoPlaceholder}>
      <Text variant="body2" color={colors.accent} weight="700">
        {studio.name.charAt(0)}
      </Text>
    </View>
  );
}

function ReviewItem({ item }: { item: StudioReview }) {
  const displayName = item.isAnonymous ? '匿名用户' : (item.user?.nickname ?? '用户');
  const initial = item.isAnonymous ? '匿' : (item.user?.nickname?.charAt(0) ?? '用');

  return (
    <View style={reviewStyles.card}>
      <View style={reviewStyles.header}>
        <View style={reviewStyles.avatarPlaceholder}>
          <Text variant="caption" color={colors.accent} weight="600">
            {initial}
          </Text>
        </View>
        <View style={reviewStyles.userInfo}>
          <Text variant="body2" weight="500">
            {displayName}
          </Text>
          <Text variant="caption" color={colors.textTertiary}>
            {new Date(item.createdAt).toLocaleDateString('zh-CN')}
          </Text>
        </View>
        <View style={reviewStyles.ratingBadge}>
          <Text variant="caption" color={colors.accent} weight="600">
            {'★ '}{item.rating}
          </Text>
        </View>
      </View>
      {item.content ? (
        <Text variant="body2" color={colors.textSecondary} style={reviewStyles.content}>
          {item.content}
        </Text>
      ) : null}
      {item.images.length > 0 ? (
        <View style={reviewStyles.imageRow}>
          {item.images.slice(0, 3).map((img, idx) => (
            <Image key={idx} source={{ uri: img }} style={reviewStyles.reviewImage} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function StudioDetailScreen() {
  const { studioId } = useLocalSearchParams<{ studioId: string }>();
  const router = useRouter();

  const {
    data: studio,
    isLoading: studioLoading,
    isError: studioError,
  } = useQuery({
    queryKey: ['bespoke-studio', studioId],
    queryFn: () => bespokeService.getStudio(studioId),
    enabled: !!studioId,
  });

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ['bespoke-studio-reviews', studioId],
    queryFn: () => bespokeService.getStudioReviews(studioId, 1, 20),
    enabled: !!studioId,
  });

  const handleSubmitRequest = useCallback(() => {
    router.push('/bespoke/submit');
  }, [router]);

  const renderPortfolioImage = useCallback(
    ({ item }: ListRenderItemInfo<string>) => (
      <Image source={{ uri: item }} style={portfolioStyles.image} />
    ),
    [],
  );

  if (studioLoading) {
    return <Loading variant="fullscreen" message="加载工作室详情..." />;
  }

  if (studioError || !studio) {
    return (
      <Empty
        title="工作室不存在"
        description="该工作室可能已下线"
        actionLabel="返回列表"
        onAction={() => router.back()}
      />
    );
  }

  const cityText = studio.city
    ? (studio.address ? `${studio.city} · ${studio.address}` : studio.city)
    : null;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <StudioCover studio={studio} />

        <View style={styles.mainInfo}>
          <View style={styles.nameRow}>
            <StudioLogo studio={studio} />
            <View style={styles.nameCol}>
              <View style={styles.nameTagRow}>
                <Text variant="h3" weight="600" numberOfLines={1} style={styles.name}>
                  {studio.name}
                </Text>
                {studio.isVerified ? (
                  <Badge label="平台认证" variant="info" size="small" />
                ) : null}
              </View>
              <View style={styles.metaRow}>
                <Text variant="caption" color={colors.accent} weight="600">
                  {'★ '}{studio.rating.toFixed(1)}
                </Text>
                <Text variant="caption" color={colors.textTertiary}>
                  {studio.reviewCount}条评价
                </Text>
                <Text variant="caption" color={colors.textTertiary}>
                  {studio.orderCount}单完成
                </Text>
              </View>
            </View>
          </View>

          {cityText ? (
            <View style={styles.locationRow}>
              <Text variant="body2" color={colors.textSecondary}>
                {cityText}
              </Text>
            </View>
          ) : null}

          <View style={styles.tagSection}>
            <Text variant="caption" color={colors.textTertiary} style={styles.sectionLabel}>
              专长
            </Text>
            <View style={styles.tagRow}>
              {studio.specialties.map((s) => (
                <Badge key={s} label={s} variant="accent" size="small" />
              ))}
            </View>
          </View>

          <View style={styles.tagSection}>
            <Text variant="caption" color={colors.textTertiary} style={styles.sectionLabel}>
              服务类型
            </Text>
            <View style={styles.tagRow}>
              {studio.serviceTypes.map((t) => (
                <Badge key={t} label={t} variant="default" size="small" />
              ))}
            </View>
          </View>

          {studio.priceRange ? (
            <View style={styles.tagSection}>
              <Text variant="caption" color={colors.textTertiary} style={styles.sectionLabel}>
                价格区间
              </Text>
              <Badge
                label={PRICE_RANGE_LABELS[studio.priceRange] ?? studio.priceRange}
                variant="default"
                size="medium"
              />
            </View>
          ) : null}

          {studio.description ? (
            <View style={styles.section}>
              <Text variant="caption" color={colors.textTertiary} style={styles.sectionLabel}>
                工作室简介
              </Text>
              <Text variant="body2" color={colors.textSecondary} style={styles.description}>
                {studio.description}
              </Text>
            </View>
          ) : null}
        </View>

        {studio.portfolioImages.length > 0 ? (
          <View style={styles.section}>
            <Text variant="h3" weight="600" style={styles.sectionTitle}>
              作品集
            </Text>
            <FlatList
              data={studio.portfolioImages}
              keyExtractor={(item, index) => `${item}-${index}`}
              renderItem={renderPortfolioImage}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={portfolioStyles.list}
              ItemSeparatorComponent={() => <View style={portfolioStyles.separator} />}
            />
          </View>
        ) : null}

        <View style={styles.section}>
          <Text variant="h3" weight="600" style={styles.sectionTitle}>
            {'评价 ('}{studio.reviewCount}{')'}
          </Text>
          {reviewsLoading ? (
            <Loading variant="inline" message="加载评价..." />
          ) : (reviewsData?.items?.length ?? 0) > 0 ? (
            reviewsData!.items.map((review) => (
              <ReviewItem key={review.id} item={review} />
            ))
          ) : (
            <Empty title="暂无评价" description="该工作室还没有收到评价" />
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.bottomBar}>
        <Button
          variant="primary"
          size="large"
          fullWidth
          onPress={handleSubmitRequest}
        >
          提交定制需求
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  coverImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  coverPlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainInfo: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    resizeMode: 'cover',
  },
  logoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameCol: {
    flex: 1,
    gap: 4,
  },
  nameTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  name: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  locationRow: {
    marginTop: spacing.xs,
  },
  tagSection: {
    gap: spacing.xs,
  },
  sectionLabel: {
    marginBottom: 2,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  description: {
    lineHeight: 22,
  },
  bottomSpacer: {
    height: 100,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    ...shadows.card,
  },
});

const portfolioStyles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  separator: {
    width: spacing.sm,
  },
  image: {
    width: 200,
    height: 150,
    borderRadius: radius.md,
    resizeMode: 'cover',
  },
});

const reviewStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
    gap: 2,
  },
  ratingBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    backgroundColor: colors.accent + '10',
    borderRadius: radius.sm,
  },
  content: {
    lineHeight: 20,
  },
  imageRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  reviewImage: {
    width: 80,
    height: 80,
    borderRadius: radius.sm,
    resizeMode: 'cover',
  },
});
