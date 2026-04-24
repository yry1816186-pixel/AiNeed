/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Clipboard } from "react-native";
import { DesignTokens } from "../../../design-system/theme";
import { flatColors as colors } from "../../../design-system/theme";
import { useTheme, createStyles } from "../../../shared/contexts/ThemeContext";

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
  container: { paddingLeft: 8 },
  row: { flexDirection: "row", gap: 12 },
  left: { alignItems: "center", width: 20 },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "colors.border",
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  dotCurrent: {
    backgroundColor: "colors.error",
    borderColor: "colors.error",
  },
  dotPast: {
    backgroundColor: "colors.success",
    borderColor: "colors.success",
  },
  dotFuture: {
    borderColor: "colors.border",
  },
  checkMark: {
    fontSize: DesignTokens.typography.sizes.xs,
    color: colors.surface,
    fontWeight: "700",
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: "colors.border",
    marginVertical: 4,
  },
  content: { flex: 1, paddingBottom: 20 },
  statusText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  statusTextCurrent: {
    fontWeight: "700",
    color: "colors.error",
  },
  statusTextFuture: {
    color: DesignTokens.colors.neutral[300],
  },
  timeText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: colors.textTertiary,
    marginTop: 4,
  },
  trackingText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: "colors.info",
    marginTop: 4,
  },
}));
