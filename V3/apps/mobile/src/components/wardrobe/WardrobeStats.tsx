import React from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { Svg, Circle, Path } from 'react-native-svg';
import { colors, spacing, radius, shadows, typography } from '../../theme';
import { Text } from '../ui/Text';
import type { WardrobeStatsResponse, ClothingCategory } from '../../services/wardrobe.service';
import { CATEGORY_LABELS } from '../../hooks/useWardrobe';

interface WardrobeStatsProps {
  visible: boolean;
  stats: WardrobeStatsResponse | undefined;
  onClose: () => void;
}

const CATEGORY_COLORS: Record<ClothingCategory, string> = {
  top: '#E94560',
  bottom: '#2196F3',
  outerwear: '#FF9800',
  shoes: '#4CAF50',
  bag: '#9C27B0',
  accessory: '#00BCD4',
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_SIZE = 160;
const CHART_CENTER = CHART_SIZE / 2;
const CHART_RADIUS = 55;
const CHART_STROKE = 20;

function DonutChart({ categories }: { categories: WardrobeStatsResponse['categories'] }) {
  const total = categories.reduce((sum, cat) => sum + cat.count, 0);
  if (total === 0) return null;

  let accumulatedAngle = 0;
  const segments = categories.map((cat) => {
    const angle = (cat.count / total) * 360;
    const startAngle = accumulatedAngle;
    accumulatedAngle += angle;
    return {
      category: cat.category,
      count: cat.count,
      startAngle,
      angle,
      color: CATEGORY_COLORS[cat.category],
    };
  });

  const arcs = segments.map((seg) => {
    const startRad = (seg.startAngle - 90) * (Math.PI / 180);
    const endRad = (seg.startAngle + seg.angle - 90) * (Math.PI / 180);
    const largeArc = seg.angle > 180 ? 1 : 0;

    const x1 = CHART_CENTER + CHART_RADIUS * Math.cos(startRad);
    const y1 = CHART_CENTER + CHART_RADIUS * Math.sin(startRad);
    const x2 = CHART_CENTER + CHART_RADIUS * Math.cos(endRad);
    const y2 = CHART_CENTER + CHART_RADIUS * Math.sin(endRad);

    const d = [
      'M', x1, y1,
      'A', CHART_RADIUS, CHART_RADIUS, 0, largeArc, 1, x2, y2,
    ].join(' ');

    return (
      <Path
        key={seg.category}
        d={d}
        fill="none"
        stroke={seg.color}
        strokeWidth={CHART_STROKE}
        strokeLinecap="butt"
      />
    );
  });

  return (
    <View style={chartStyles.wrapper}>
      <Svg width={CHART_SIZE} height={CHART_SIZE} viewBox={`0 0 ${CHART_SIZE} ${CHART_SIZE}`}>
        <Circle
          cx={CHART_CENTER}
          cy={CHART_CENTER}
          r={CHART_RADIUS}
          fill="none"
          stroke={colors.gray100}
          strokeWidth={CHART_STROKE}
        />
        {arcs}
      </Svg>
      <View style={chartStyles.centerLabel}>
        <Text variant="h2" align="center" style={chartStyles.centerNumber}>
          {total}
        </Text>
        <Text variant="caption" color={colors.textTertiary} align="center">
          件服装
        </Text>
      </View>
    </View>
  );
}

export const WardrobeStats: React.FC<WardrobeStatsProps> = ({
  visible,
  stats,
  onClose,
}) => {
  if (!stats) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={styles.content}
          activeOpacity={1}
          onPress={() => {}}
        >
          <View style={styles.header}>
            <Text variant="h3">衣橱统计</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <Path
                  d="M18 6L6 18M6 6L18 18"
                  stroke={colors.textSecondary}
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </Svg>
            </TouchableOpacity>
          </View>

          <View style={styles.chartSection}>
            <DonutChart categories={stats.categories} />
          </View>

          <View style={styles.legendSection}>
            {stats.categories.map((cat) => (
              <View key={cat.category} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: CATEGORY_COLORS[cat.category] }]} />
                <Text variant="body2" style={styles.legendLabel}>
                  {CATEGORY_LABELS[cat.category]}
                </Text>
                <Text variant="body2" color={colors.textTertiary}>
                  {cat.count}件
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.divider} />

          <View style={styles.colorSection}>
            <Text variant="body2" weight="600" style={styles.sectionTitle}>
              色彩分布
            </Text>
            <View style={styles.colorRow}>
              {stats.colors.map((color) => (
                <View
                  key={color.hex}
                  style={[styles.colorBlock, { backgroundColor: color.hex }]}
                />
              ))}
            </View>
          </View>

          <View style={styles.totalSection}>
            <Text variant="h2" color={colors.accent}>{stats.total}</Text>
            <Text variant="body2" color={colors.textTertiary} style={styles.totalLabel}>
              件服装
            </Text>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: SCREEN_WIDTH - 48,
    backgroundColor: colors.backgroundCard,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadows.modal,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  chartSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  legendSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    width: '45%',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    flex: 1,
    lineHeight: typography.body2.lineHeight,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.xl,
  },
  colorSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    marginBottom: spacing.md,
    lineHeight: typography.body2.lineHeight,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  colorBlock: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
  },
  totalSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  totalLabel: {
    lineHeight: typography.body2.lineHeight,
  },
});

const chartStyles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerNumber: {
    lineHeight: typography.h2.lineHeight,
  },
});
