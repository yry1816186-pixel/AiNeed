import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";
import ShareQRCode from "./ShareQRCode";

/**
 * Common layout wrapper for all share card types.
 *
 * Provides:
 * - Content area for child components
 * - Brand footer bar with "寻裳 XUNO" logo + "让 AI 帮你搭" tagline + QR code
 *
 * Aspect ratio ~3:4 optimized for Xiaohongshu sharing.
 * Root View has collapsable={false} for Android view-shot compatibility.
 */

interface ShareCardLayoutProps {
  children: React.ReactNode;
  qrPath: string;
}

const ShareCardLayout: React.FC<ShareCardLayoutProps> = ({ children, qrPath }) => {
  return (
    <View collapsable={false} style={styles.card}>
      {/* Main content area */}
      <View style={styles.content}>{children}</View>

      {/* Brand footer bar */}
      <View style={styles.brandFooter}>
        <View style={styles.brandInfo}>
          <Text style={styles.brandLogo}>{"寻裳 XUNO"}</Text>
          <Text style={styles.brandTagline}>{"让 AI 帮你搭"}</Text>
        </View>
        <ShareQRCode path={qrPath} size={72} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: DesignTokens.colors.backgrounds.secondary,
    borderRadius: 16,
    overflow: "hidden",
    aspectRatio: 3 / 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  brandFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: DesignTokens.colors.neutral[800],
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  brandInfo: {
    flex: 1,
  },
  brandLogo: {
    fontSize: 18,
    fontWeight: "600",
    color: DesignTokens.colors.neutral.white,
    letterSpacing: 1,
  },
  brandTagline: {
    fontSize: 12,
    color: DesignTokens.colors.backgrounds.secondary,
    marginTop: 2,
    opacity: 0.8,
  },
});

export default ShareCardLayout;
