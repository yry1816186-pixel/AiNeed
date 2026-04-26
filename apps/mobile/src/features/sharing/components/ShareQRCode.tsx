import React from "react";
import { View } from "react-native";
import { DesignTokens } from "../../../design-system/theme/tokens/design-tokens";

/**
 * QR Code component for share cards.
 *
 * Renders a QR code encoding a mini-program path using react-native-qrcode-svg.
 * Falls back to a placeholder View when the native module is unavailable (e.g. in Storybook).
 */

interface ShareQRCodeProps {
  path: string;
  size?: number;
}

const QR_SIZE = 80;

const ShareQRCode: React.FC<ShareQRCodeProps> = ({ path, size = QR_SIZE }) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
    const QRCode = require("react-native-qrcode-svg").default;
    return (
      <QRCode
        value={path}
        size={size}
        color={DesignTokens.colors.neutral[800]}
        backgroundColor={DesignTokens.colors.backgrounds.secondary}
      />
    );
  } catch {
    // Fallback: render placeholder when native module is unavailable
    return (
      <View
        style={{
          width: size,
          height: size,
          backgroundColor: DesignTokens.colors.backgrounds.secondary,
          borderWidth: 1,
          borderColor: DesignTokens.colors.neutral[800],
          borderRadius: 4,
        }}
      />
    );
  }
};

export default ShareQRCode;
