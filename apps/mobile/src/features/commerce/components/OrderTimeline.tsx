import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Clipboard } from "react-native";
import { DesignTokens, Spacing } from '../../../design-system/theme';
import { useTheme, createStyles } from '../../../shared/contexts/ThemeContext';

interface TimelineEvent {
  status: string;
  time: string;
  description: string;
  trackingNumber?: string;
  carrier?: string;
}

interface OrderTimelineProps {
  events: TimelineEvent[];
}

const _STATUS_ORDER = ["pending", "paid", "shipped", "delivered"];

export const OrderTimeline: React.FC<OrderTimelineProps> = ({ events }) => {
  const { colors } = useTheme();
  const styles = useStyles(colors);
  if (!events || events.length === 0) {
    return null;
  }

  const latestStatus = events[0]?.status;

  return (
    <View style={styles.container}>
      {events.map((event, index) => {
        const isCurrent = event.status === latestStatus;
        const isPast = index > 0;
        const isFuture = false;

        return (
          <View key={`${event.status}-${index}`} style={styles.row}>
            <View style={styles.left}>
              <View
                style={[
                  styles.dot,
                  isCurrent && styles.dotCurrent,
                  isPast && styles.dotPast,
                  isFuture && styles.dotFuture,
                ]}
              >
                {isPast && <Text style={styles.checkMark}>&#10003;</Text>}
              </View>
              {index < events.length - 1 && <View style={styles.line} />}
            </View>
            <View style={styles.content}>
              <Text
                style={[
                  styles.statusText,
                  isCurrent && styles.statusTextCurrent,
                  isFuture && styles.statusTextFuture,
                ]}
              >
                {event.description}
              </Text>
              <Text style={styles.timeText}>{new Date(event.time).toLocaleString("zh-CN")}</Text>
              {event.trackingNumber ? (
                <TouchableOpacity
                  onPress={() => {
                    Clipboard.setString(event.trackingNumber ?? "");
                  }}
                >
                  <Text style={styles.trackingText}>
                    {event.carrier}: {event.trackingNumber} (tap to copy)
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const useStyles = createStyles((colors) => ({
  container: { paddingLeft: Spacing.sm},
  row: { flexDirection: "row", gap: DesignTokens.spacing[3]},
  left: { alignItems: "center", width: DesignTokens.spacing[5] },
  dot: {
    width: DesignTokens.spacing['3.5'],
    height: DesignTokens.spacing['3.5'],
    borderRadius: 7,
    borderWidth: 2,
    borderColor: DesignTokens.colors.borders.default,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  dotCurrent: {
    backgroundColor: DesignTokens.colors.brand.terracotta,
    borderColor: DesignTokens.colors.brand.terracotta,
  },
  dotPast: {
    backgroundColor: DesignTokens.colors.semantic.success,
    borderColor: DesignTokens.colors.semantic.success,
  },
  dotFuture: {
    borderColor: DesignTokens.colors.borders.default,
  },
  checkMark: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: colors.surface,
    fontWeight: "700",
  },
  line: {
    width: DesignTokens.spacing['0.5'],
    flex: 1,
    backgroundColor: DesignTokens.colors.borders.default,
    marginVertical: Spacing.xs,
  },
  content: { flex: 1, paddingBottom: DesignTokens.spacing[5]},
  statusText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  statusTextCurrent: {
    fontWeight: "700",
    color: DesignTokens.colors.brand.terracotta,
  },
  statusTextFuture: {
    color: DesignTokens.colors.neutral[300],
  },
  timeText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textTertiary,
    marginTop: Spacing.xs,
  },
  trackingText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: DesignTokens.colors.semantic.info,
    marginTop: Spacing.xs,
  },
}))
