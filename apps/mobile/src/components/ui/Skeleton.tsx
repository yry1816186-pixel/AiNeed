import React, { useEffect, useRef } from "react";
import { View, StyleSheet, ViewStyle, Dimensions, Animated } from "react-native";
import { Colors, Spacing, BorderRadius } from "../../theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

function SkeletonPlaceholder({
  backgroundColor,
  highlightColor,
  speed,
  children,
}: {
  backgroundColor: string;
  highlightColor: string;
  speed: number;
  children: React.ReactNode;
}) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: speed,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: speed,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue, speed]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.3],
  });

  return (
    <Animated.View style={{ opacity }}>{children}</Animated.View>
  );
}

interface SkeletonProps {
  width?: number;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = SCREEN_WIDTH,
  height = 20,
  borderRadius = BorderRadius.md,
  style,
}: SkeletonProps) {
  return (
    <SkeletonPlaceholder
      backgroundColor={Colors.neutral[200]}
      highlightColor={Colors.neutral[100]}
      speed={1200}
    >
      <View style={[{ width, height, borderRadius }, style]} />
    </SkeletonPlaceholder>
  );
}

interface ProductCardSkeletonProps {
  style?: ViewStyle;
}

export function ProductCardSkeleton({ style }: ProductCardSkeletonProps) {
  return (
    <SkeletonPlaceholder
      backgroundColor={Colors.neutral[200]}
      highlightColor={Colors.neutral[100]}
      speed={1200}
    >
      <View style={[styles.productCard, style]}>
        <View style={styles.productImage} />
        <View style={styles.productContent}>
          <View style={styles.productTitle} />
          <View style={styles.productMeta} />
          <View style={styles.productPrice} />
        </View>
      </View>
    </SkeletonPlaceholder>
  );
}

interface ProductListSkeletonProps {
  count?: number;
  columns?: number;
  style?: ViewStyle;
}

export function ProductListSkeleton({
  count = 6,
  columns = 2,
  style,
}: ProductListSkeletonProps) {
  return (
    <View style={[styles.listContainer, style]}>
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton
          key={index}
          style={{ width: `${100 / columns - 2}%` }}
        />
      ))}
    </View>
  );
}

interface RecommendationCardSkeletonProps {
  style?: ViewStyle;
}

export function RecommendationCardSkeleton({
  style,
}: RecommendationCardSkeletonProps) {
  return (
    <SkeletonPlaceholder
      backgroundColor={Colors.neutral[200]}
      highlightColor={Colors.neutral[100]}
      speed={1200}
    >
      <View style={[styles.recommendationCard, style]}>
        <View style={styles.recommendationHeader}>
          <View style={styles.recommendationTitle} />
          <View style={styles.recommendationTags}>
            <View style={styles.tag} />
            <View style={styles.tag} />
          </View>
        </View>
        <View style={styles.recommendationItems}>
          <View style={styles.recommendationItem} />
          <View style={styles.recommendationItem} />
          <View style={styles.recommendationItem} />
        </View>
      </View>
    </SkeletonPlaceholder>
  );
}

interface ProfileSkeletonProps {
  style?: ViewStyle;
}

export function ProfileSkeleton({ style }: ProfileSkeletonProps) {
  return (
    <SkeletonPlaceholder
      backgroundColor={Colors.neutral[200]}
      highlightColor={Colors.neutral[100]}
      speed={1200}
    >
      <View style={[styles.profileContainer, style]}>
        <View style={styles.avatar} />
        <View style={styles.userName} />
        <View style={styles.userBio} />
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={styles.statValue} />
            <View style={styles.statLabel} />
          </View>
          <View style={styles.statItem}>
            <View style={styles.statValue} />
            <View style={styles.statLabel} />
          </View>
          <View style={styles.statItem}>
            <View style={styles.statValue} />
            <View style={styles.statLabel} />
          </View>
        </View>
      </View>
    </SkeletonPlaceholder>
  );
}

interface TextSkeletonProps {
  lines?: number;
  lineHeight?: number;
  lastLineWidth?: number;
  style?: ViewStyle;
}

export function TextSkeleton({
  lines = 3,
  lineHeight = 16,
  lastLineWidth = 60,
  style,
}: TextSkeletonProps) {
  return (
    <SkeletonPlaceholder
      backgroundColor={Colors.neutral[200]}
      highlightColor={Colors.neutral[100]}
      speed={1200}
    >
      <View style={[styles.textContainer, style]}>
        {Array.from({ length: lines }).map((_, index) => (
          <View
            key={index}
            style={{
              width: index === lines - 1 ? `${lastLineWidth}%` : "100%",
              height: lineHeight,
              borderRadius: BorderRadius.sm,
              marginBottom: index < lines - 1 ? Spacing[2] : 0,
            }}
          />
        ))}
      </View>
    </SkeletonPlaceholder>
  );
}

interface CircleSkeletonProps {
  size?: number;
  style?: ViewStyle;
}

export function CircleSkeleton({ size = 48, style }: CircleSkeletonProps) {
  return (
    <SkeletonPlaceholder
      backgroundColor={Colors.neutral[200]}
      highlightColor={Colors.neutral[100]}
      speed={1200}
    >
      <View
        style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
      />
    </SkeletonPlaceholder>
  );
}

interface WardrobeSkeletonProps {
  count?: number;
  style?: ViewStyle;
}

export function WardrobeSkeleton({ count = 6, style }: WardrobeSkeletonProps) {
  return (
    <SkeletonPlaceholder
      backgroundColor={Colors.neutral[200]}
      highlightColor={Colors.neutral[100]}
      speed={1200}
    >
      <View style={[styles.wardrobeGrid, style]}>
        {Array.from({ length: count }).map((_, index) => (
          <View key={index} style={styles.wardrobeItem}>
            <View style={styles.wardrobeImage} />
            <View style={styles.wardrobeInfo}>
              <View style={styles.wardrobeName} />
              <View style={styles.wardrobeBrand} />
            </View>
          </View>
        ))}
      </View>
    </SkeletonPlaceholder>
  );
}

const styles = StyleSheet.create({
  productCard: {
    backgroundColor: Colors.neutral[0],
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    marginBottom: Spacing[3],
  },
  productImage: {
    width: "100%",
    height: 180,
  },
  productContent: {
    padding: Spacing[3],
    gap: Spacing[2],
  },
  productTitle: {
    width: "70%",
    height: 14,
    borderRadius: BorderRadius.sm,
  },
  productMeta: {
    width: "50%",
    height: 12,
    borderRadius: BorderRadius.sm,
  },
  productPrice: {
    width: "40%",
    height: 18,
    borderRadius: BorderRadius.sm,
  },
  listContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing[3],
    padding: Spacing[4],
  },
  recommendationCard: {
    backgroundColor: Colors.neutral[0],
    borderRadius: BorderRadius["2xl"],
    padding: Spacing[4],
    marginBottom: Spacing[4],
  },
  recommendationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing[3],
  },
  recommendationTitle: {
    width: "40%",
    height: 18,
    borderRadius: BorderRadius.sm,
  },
  recommendationTags: {
    flexDirection: "row",
    gap: Spacing[2],
  },
  tag: {
    width: 50,
    height: 20,
    borderRadius: BorderRadius.full,
  },
  recommendationItems: {
    flexDirection: "row",
    gap: Spacing[3],
  },
  recommendationItem: {
    width: 100,
    height: 120,
    borderRadius: BorderRadius.lg,
  },
  profileContainer: {
    alignItems: "center",
    padding: Spacing[6],
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: Spacing[4],
  },
  userName: {
    width: 120,
    height: 20,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing[2],
  },
  userBio: {
    width: 200,
    height: 14,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing[4],
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing[6],
  },
  statItem: {
    alignItems: "center",
  },
  statValue: {
    width: 40,
    height: 24,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing[1],
  },
  statLabel: {
    width: 50,
    height: 12,
    borderRadius: BorderRadius.sm,
  },
  textContainer: {
    width: "100%",
  },
  wardrobeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing[3],
    padding: Spacing[4],
  },
  wardrobeItem: {
    width: "48%",
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
    backgroundColor: Colors.neutral[0],
  },
  wardrobeImage: {
    width: "100%",
    height: 160,
  },
  wardrobeInfo: {
    padding: Spacing[3],
    gap: Spacing[1],
  },
  wardrobeName: {
    width: "70%",
    height: 14,
    borderRadius: BorderRadius.sm,
  },
  wardrobeBrand: {
    width: "50%",
    height: 12,
    borderRadius: BorderRadius.sm,
  },
});
