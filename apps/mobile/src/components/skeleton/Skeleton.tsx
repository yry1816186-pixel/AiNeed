import React from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from '@/src/polyfills/expo-linear-gradient';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: any;
}

export function Skeleton({
  width = "100%",
  height = 20,
  borderRadius = 4,
  style,
}: SkeletonProps) {
  return (
    <View style={[styles.skeleton, { width, height, borderRadius }, style]}>
      <LinearGradient
        colors={["#e4e4e7", "#f4f4f5", "#e4e4e7"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      />
    </View>
  );
}

export function SkeletonText({
  lines = 3,
  lineHeight = 16,
  spacing = 8,
  style,
}: {
  lines?: number;
  lineHeight?: number;
  spacing?: number;
  style?: any;
}) {
  return (
    <View style={style}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? "60%" : "100%"}
          height={lineHeight}
          style={{ marginBottom: index < lines - 1 ? spacing : 0 }}
        />
      ))}
    </View>
  );
}

export function SkeletonCard({ style }: { style?: any }) {
  return (
    <View style={[styles.card, style]}>
      <Skeleton width="100%" height={150} borderRadius={8} />
      <View style={styles.cardContent}>
        <Skeleton width="80%" height={16} style={{ marginBottom: 8 }} />
        <Skeleton width="50%" height={14} style={{ marginBottom: 8 }} />
        <Skeleton width="30%" height={18} />
      </View>
    </View>
  );
}

export function SkeletonList({
  count = 4,
  style,
}: {
  count?: number;
  style?: any;
}) {
  return (
    <View style={style}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} style={styles.listItem} />
      ))}
    </View>
  );
}

export function SkeletonGrid({
  columns = 2,
  rows = 3,
  gap = 16,
  style,
}: {
  columns?: number;
  rows?: number;
  gap?: number;
  style?: any;
}) {
  return (
    <View style={[styles.grid, { gap }, style]}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <View key={colIndex} style={styles.gridItem}>
              <SkeletonCard />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: "#e4e4e7",
    overflow: "hidden",
  },
  gradient: {
    flex: 1,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
  },
  cardContent: {
    padding: 12,
  },
  listItem: {
    marginBottom: 12,
  },
  grid: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  gridItem: {
    flex: 1,
    marginHorizontal: 4,
  },
});

export default Skeleton;
