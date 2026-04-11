import React, { useMemo } from 'react';
import {
  View,
  Image,
  type StyleProp,
  type ViewStyle,
  type ImageSourcePropType,
  StyleSheet,
  type DimensionValue,
} from 'react-native';
import { colors, spacing, radius } from '../../theme';
import type { ProductTemplate, ProductColor, PrintArea } from '../../services/custom-order.service';

interface ProductPreviewProps {
  template: ProductTemplate;
  selectedColor: ProductColor;
  designImageUrl: string;
  designPosition: { x: number; y: number };
  designScale: number;
  designRotation: number;
  style?: StyleProp<ViewStyle>;
}

const PREVIEW_WIDTH = 320;
const PREVIEW_ASPECT: Record<string, number> = {
  tshirt: 1.2,
  hoodie: 1.2,
  hat: 1.0,
  bag: 1.1,
  phone_case: 1.8,
};

function computeDesignLayout(
  printArea: PrintArea,
  containerWidth: number,
  containerHeight: number,
  designScale: number,
): {
  left: number;
  top: number;
  width: number;
  height: number;
} {
  const areaWidth = (printArea.width / 100) * containerWidth;
  const areaHeight = (printArea.height / 100) * containerHeight;
  const areaLeft = (printArea.x / 100) * containerWidth;
  const areaTop = (printArea.y / 100) * containerHeight;

  const scaledWidth = areaWidth * designScale;
  const scaledHeight = areaHeight * designScale;

  const left = areaLeft + (areaWidth - scaledWidth) / 2;
  const top = areaTop + (areaHeight - scaledHeight) / 2;

  return { left, top, width: scaledWidth, height: scaledHeight };
}

export const ProductPreview: React.FC<ProductPreviewProps> = ({
  template,
  selectedColor,
  designImageUrl,
  designPosition,
  designScale,
  designRotation,
  style,
}) => {
  const aspect = PREVIEW_ASPECT[template.category] ?? 1.2;
  const previewHeight = PREVIEW_WIDTH / aspect;

  const designLayout = useMemo(
    () => computeDesignLayout(template.printArea, PREVIEW_WIDTH, previewHeight, designScale),
    [template.printArea, designScale, previewHeight],
  );

  const adjustedLeft = designLayout.left + designPosition.x;
  const adjustedTop = designLayout.top + designPosition.y;

  const rotationRad = (designRotation * Math.PI) / 180;

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.previewFrame, { width: PREVIEW_WIDTH as DimensionValue, height: previewHeight as DimensionValue }]}>
        <Image
          source={{ uri: selectedColor.image || template.baseImage } as ImageSourcePropType}
          style={styles.baseImage}
          resizeMode="contain"
        />
        <View
          style={[
            styles.designOverlay,
            {
              left: adjustedLeft,
              top: adjustedTop,
              width: designLayout.width as DimensionValue,
              height: designLayout.height as DimensionValue,
              transform: [{ rotate: `${rotationRad}rad` }],
            },
          ]}
          pointerEvents="none"
        >
          <Image
            source={{ uri: designImageUrl } as ImageSourcePropType}
            style={styles.designImage}
            resizeMode="contain"
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  previewFrame: {
    position: 'relative',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.xl,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  baseImage: {
    width: '100%',
    height: '100%',
  },
  designOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  designImage: {
    width: '100%',
    height: '100%',
  },
});
