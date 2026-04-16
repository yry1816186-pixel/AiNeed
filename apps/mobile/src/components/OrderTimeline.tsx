import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Clipboard } from "react-native";
import { DesignTokens } from "../design-system/theme";

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

const styles = StyleSheet.create({
  container: { paddingLeft: 8 },
  row: { flexDirection: "row", gap: 12 },
  left: { alignItems: "center", width: 20 },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "DesignTokens.colors.borders.default",
    backgroundColor: DesignTokens.colors.backgrounds.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  dotCurrent: {
    backgroundColor: "DesignTokens.colors.semantic.error",
    borderColor: "DesignTokens.colors.semantic.error",
  },
  dotPast: {
    backgroundColor: "DesignTokens.colors.semantic.success",
    borderColor: "DesignTokens.colors.semantic.success",
  },
  dotFuture: {
    borderColor: "DesignTokens.colors.borders.default",
  },
  checkMark: {
    fontSize: 8,
    color: DesignTokens.colors.backgrounds.primary,
    fontWeight: "700",
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: "DesignTokens.colors.borders.default",
    marginVertical: 4,
  },
  content: { flex: 1, paddingBottom: 20 },
  statusText: {
    fontSize: DesignTokens.typography.sizes.base,
    fontWeight: "500",
    color: DesignTokens.colors.text.primary,
  },
  statusTextCurrent: {
    fontWeight: "700",
    color: "DesignTokens.colors.semantic.error",
  },
  statusTextFuture: {
    color: DesignTokens.colors.neutral[300],
  },
  timeText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: DesignTokens.colors.text.tertiary,
    marginTop: 4,
  },
  trackingText: {
    fontSize: DesignTokens.typography.sizes.sm,
    color: "DesignTokens.colors.semantic.info",
    marginTop: 4,
  },
});
