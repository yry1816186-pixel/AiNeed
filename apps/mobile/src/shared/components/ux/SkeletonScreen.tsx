import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { Colors, Spacing, BorderRadius } from '../design-system/theme';

const SkeletonBlock: React.FC<{
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}> = ({ width = "100%", height = 20, borderRadius = BorderRadius.sm, style }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(animatedValue, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [animatedValue]);
  const opacity = animatedValue.interpolate({ inputRange: [0, 1], outputRange: [1, 0.3] });
  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: Colors.neutral[200], opacity },
        style,
      ]}
    />
  );
};

type SkeletonVariant = "list" | "card" | "detail";

interface SkeletonScreenProps {
  variant?: SkeletonVariant;
  count?: number;
  accessibilityLabel?: string;
}

const ListSkeleton: React.FC<{ count: number }> = ({ count }) => (
  <View style={styles.listContainer}>
    {Array.from({ length: count }).map((_, i) => (
      <View key={i} style={styles.listItem}>
        <SkeletonBlock width={56} height={56} borderRadius={BorderRadius.lg} />
        <View style={styles.listContent}>
          <SkeletonBlock width="70%" height={16} />
          <SkeletonBlock width="45%" height={14} />
          <SkeletonBlock width="30%" height={12} />
        </View>
      </View>
    ))}
  </View>
);

const CardSkeleton: React.FC<{ count: number }> = ({ count }) => (
  <View style={styles.cardGrid}>
    {Array.from({ length: count }).map((_, i) => (
      <View key={i} style={styles.cardItem}>
        <SkeletonBlock width="100%" height={160} borderRadius={0} />
        <View style={styles.cardContent}>
          <SkeletonBlock width="80%" height={14} />
          <SkeletonBlock width="50%" height={12} />
          <SkeletonBlock width="35%" height={18} />
        </View>
      </View>
    ))}
  </View>
);

const DetailSkeleton: React.FC = () => (
  <View style={styles.detailContainer}>
    <SkeletonBlock width="100%" height={240} borderRadius={0} />
    <View style={styles.detailContent}>
      <SkeletonBlock width="60%" height={24} />
      <SkeletonBlock width="40%" height={16} />
      <View style={styles.detailMeta}>
        <SkeletonBlock width={80} height={32} borderRadius={BorderRadius.full} />
        <SkeletonBlock width={80} height={32} borderRadius={BorderRadius.full} />
        <SkeletonBlock width={80} height={32} borderRadius={BorderRadius.full} />
      </View>
      <SkeletonBlock width="100%" height={14} />
      <SkeletonBlock width="100%" height={14} />
      <SkeletonBlock width="75%" height={14} />
    </View>
  </View>
);

export function SkeletonScreen({
  variant = "list",
  count = 4,
  accessibilityLabel,
}: SkeletonScreenProps) {
  const label =
    accessibilityLabel ||
    `加载中${variant === "list" ? "列表" : variant === "card" ? "卡片" : "详情"}`;
  return (
    <View style={styles.container} accessibilityLabel={label} accessibilityRole="progressbar">
      {variant === "list" && <ListSkeleton count={count} />}
      {variant === "card" && <CardSkeleton count={count} />}
      {variant === "detail" && <DetailSkeleton />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  listContainer: { padding: Spacing[4], gap: Spacing[3] },
  listItem: {
    flexDirection: "row",
    gap: Spacing[3],
    backgroundColor: Colors.neutral.white,
    padding: Spacing[3],
    borderRadius: BorderRadius.xl,
  },
  listContent: { flex: 1, gap: Spacing[2], justifyContent: "center" },
  cardGrid: { flexDirection: "row", flexWrap: "wrap", padding: Spacing[3], gap: Spacing[3] },
  cardItem: {
    width: "48%",
    backgroundColor: Colors.neutral.white,
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  cardContent: { padding: Spacing[3], gap: Spacing[2] },
  detailContainer: { backgroundColor: Colors.neutral.white },
  detailContent: { padding: Spacing[4], gap: Spacing[3] },
  detailMeta: { flexDirection: "row", gap: Spacing[2], marginVertical: Spacing[2] },
});

export default SkeletonScreen;
