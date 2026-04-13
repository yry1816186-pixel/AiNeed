import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Colors, Spacing, BorderRadius } from "../../theme";

interface ProfileCompletenessBarProps {
  percentage: number;
  missingFields: string[];
  onPress?: () => void;
}

const MISSING_FIELD_LABELS: Record<string, string> = {
  gender: "性别",
  birthDate: "出生日期",
  height: "身高",
  weight: "体重",
  bodyType: "体型",
  skinTone: "肤色",
  faceShape: "脸型",
  colorSeason: "色彩季型",
  stylePreferences: "风格偏好",
  sizeTop: "上装尺码",
  sizeBottom: "下装尺码",
  sizeShoes: "鞋码",
};

function formatMissingFields(fields: string[]): string {
  const labels = fields.map((f) => MISSING_FIELD_LABELS[f] || f);
  if (labels.length <= 3) {
    return `还需完善: ${labels.join("、")}`;
  }
  return `还需完善: ${labels.slice(0, 3).join("、")}等${labels.length}项`;
}

export const ProfileCompletenessBar: React.FC<ProfileCompletenessBarProps> = ({
  percentage,
  missingFields,
  onPress,
}) => {
  const clampedPercentage = Math.max(0, Math.min(100, percentage));

  const content = (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.percentageText}>画像完整度 {clampedPercentage}%</Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${clampedPercentage}%` },
          ]}
        />
      </View>
      {missingFields.length > 0 && (
        <Text style={styles.missingText} numberOfLines={1}>
          {formatMissingFields(missingFields)}
        </Text>
      )}
      {clampedPercentage < 80 && (
        <Text style={styles.ctaText}>
          完善画像解锁个性化推荐
        </Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityLabel={`画像完整度 ${clampedPercentage}%`}
        accessibilityRole="button"
        style={styles.pressable}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      accessibilityLabel={`画像完整度 ${clampedPercentage}%`}
    >
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  pressable: {
    minHeight: 44,
  },
  container: {
    paddingVertical: Spacing[3],
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing[2],
  },
  percentageText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.neutral[900],
  },
  track: {
    height: 8,
    backgroundColor: Colors.neutral[200],
    borderRadius: 12,
    overflow: "hidden",
  },
  fill: {
    height: 8,
    backgroundColor: Colors.primary[500],
    borderRadius: 12,
  },
  missingText: {
    fontSize: 12,
    fontWeight: "400",
    color: Colors.neutral[600],
    marginTop: Spacing[2],
  },
  ctaText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary[500],
    marginTop: Spacing[1],
  },
});

export default ProfileCompletenessBar;
