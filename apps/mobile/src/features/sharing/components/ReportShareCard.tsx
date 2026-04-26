import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import ShareCardLayout from "./ShareCardLayout";
import { encodeMiniProgramPath } from "../utils/qr-encoder";

/**
 * Report Summary Share Card
 *
 * Displays color palette circles, style type badge, and a brief summary.
 * Professional look to encourage sharing style analysis results.
 */

interface ReportShareCardProps {
  styleType: string;
  colorPalette: string[];
  summary: string;
  referrerId: string;
}

const ReportShareCard: React.FC<ReportShareCardProps> = ({
  styleType,
  colorPalette,
  summary,
  referrerId,
}) => {
  const qrPath = encodeMiniProgramPath({
    referrerId,
    cardType: "report",
  });

  return (
    <View collapsable={false} style={styles.wrapper}>
      <ShareCardLayout qrPath={qrPath}>
        {/* Style type badge */}
        <View style={styles.styleTypeBadge}>
          <Text style={styles.styleType}>{styleType}</Text>
        </View>

        {/* Color palette label */}
        <Text style={styles.paletteLabel}>{"专属色彩"}</Text>

        {/* Color palette circles */}
        <View style={styles.paletteRow}>
          {colorPalette.slice(0, 6).map((color, i) => (
            <View
              key={i}
              collapsable={false}
              style={[styles.colorCircle, { backgroundColor: color }]}
            />
          ))}
        </View>

        {/* Summary */}
        <Text style={styles.summary} numberOfLines={3}>
          {summary}
        </Text>
      </ShareCardLayout>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
  },
  styleTypeBadge: {
    backgroundColor: `${DesignTokens.colors.brand.terracotta}1A`,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  styleType: {
    fontSize: 16,
    fontWeight: "700",
    color: DesignTokens.colors.neutral[800],
  },
  paletteLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: DesignTokens.colors.text.tertiary,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  paletteRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: DesignTokens.colors.borders.light,
  },
  summary: {
    fontSize: 14,
    color: DesignTokens.colors.text.secondary,
    lineHeight: 22,
  },
});

export default ReportShareCard;
