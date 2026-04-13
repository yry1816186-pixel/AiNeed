import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, {
  Circle,
  Path,
  Line,
  Text as SvgText,
  G,
  Defs,
  ClipPath,
} from 'react-native-svg';
import { colors } from '../../theme/tokens/colors';
import { typography } from '../../theme/tokens/typography';

export type BodyType =
  | 'rectangle'
  | 'triangle'
  | 'inverted_triangle'
  | 'hourglass'
  | 'oval';

export interface BodySilhouetteProps {
  bodyType: BodyType;
  shoulderRatio?: number;
  waistRatio?: number;
  hipRatio?: number;
  width?: number;
  height?: number;
  color?: string;
  showLabels?: boolean;
  accessibilityLabel?: string;
}

const BODY_RATIOS: Record<
  BodyType,
  { shoulder: number; waist: number; hip: number }
> = {
  hourglass: { shoulder: 1.0, waist: 0.7, hip: 1.0 },
  triangle: { shoulder: 0.8, waist: 0.85, hip: 1.15 },
  inverted_triangle: { shoulder: 1.15, waist: 0.8, hip: 0.8 },
  rectangle: { shoulder: 0.95, waist: 0.9, hip: 0.95 },
  oval: { shoulder: 0.9, waist: 1.15, hip: 0.9 },
};

export const BodySilhouette: React.FC<BodySilhouetteProps> = ({
  bodyType,
  shoulderRatio = 1.0,
  waistRatio = 1.0,
  hipRatio = 1.0,
  width = 120,
  height = 200,
  color = colors.brand.warmPrimary,
  showLabels = true,
  accessibilityLabel,
}) => {
  const defaultA11yLabel =
    accessibilityLabel ||
    `体型轮廓: ${bodyType}, 肩部比例${shoulderRatio}, 腰部比例${waistRatio}, 臀部比例${hipRatio}`;

  const base = BODY_RATIOS[bodyType];
  const sR = base.shoulder * shoulderRatio;
  const wR = base.waist * waistRatio;
  const hR = base.hip * hipRatio;

  const cx = width / 2;
  const baseWidth = width * 0.35;

  const headR = width * 0.1;
  const headCy = headR + 4;

  const neckTop = headCy + headR;
  const neckBot = neckTop + 10;
  const neckW = baseWidth * 0.25;

  const shoulderY = neckBot + 5;
  const shoulderW = baseWidth * sR;

  const bustY = shoulderY + 20;
  const bustW = baseWidth * sR * 0.9;

  const waistY = shoulderY + 45;
  const waistW = baseWidth * wR;

  const hipY = waistY + 30;
  const hipW = baseWidth * hR;

  const legSplitY = hipY + 15;
  const legEndY = height - 10;
  const legW = baseWidth * 0.28;

  const leftShoulderX = cx - shoulderW;
  const rightShoulderX = cx + shoulderW;
  const leftBustX = cx - bustW;
  const rightBustX = cx + bustW;
  const leftWaistX = cx - waistW;
  const rightWaistX = cx + waistW;
  const leftHipX = cx - hipW;
  const rightHipX = cx + hipW;
  const leftLegOutX = cx - hipW;
  const rightLegOutX = cx + hipW;
  const leftLegInX = cx - legW * 0.4;
  const rightLegInX = cx + legW * 0.4;
  const leftLegOutEndX = cx - hipW * 0.7;
  const rightLegOutEndX = cx + hipW * 0.7;

  const bodyPath = [
    `M ${cx} ${neckTop}`,
    `L ${cx - neckW} ${neckBot}`,
    `C ${cx - neckW - 2} ${shoulderY - 3}, ${leftShoulderX + 5} ${shoulderY - 2}, ${leftShoulderX} ${shoulderY}`,
    `C ${leftShoulderX - 3} ${shoulderY + 8}, ${leftBustX} ${bustY - 8}, ${leftBustX} ${bustY}`,
    `C ${leftBustX - 2} ${bustY + 10}, ${leftWaistX + 3} ${waistY - 10}, ${leftWaistX} ${waistY}`,
    `C ${leftWaistX - 2} ${waistY + 8}, ${leftHipX + 3} ${hipY - 10}, ${leftHipX} ${hipY}`,
    `C ${leftHipX - 2} ${hipY + 6}, ${leftLegOutX} ${legSplitY - 4}, ${leftLegOutX} ${legSplitY}`,
    `L ${leftLegOutEndX} ${legEndY}`,
    `L ${leftLegInX} ${legEndY}`,
    `L ${leftLegInX} ${legSplitY}`,
    `L ${rightLegInX} ${legSplitY}`,
    `L ${rightLegInX} ${legEndY}`,
    `L ${rightLegOutEndX} ${legEndY}`,
    `L ${rightLegOutX} ${legSplitY}`,
    `C ${rightLegOutX} ${legSplitY - 4}, ${rightHipX + 2} ${hipY + 6}, ${rightHipX} ${hipY}`,
    `C ${rightHipX - 3} ${hipY - 10}, ${rightWaistX - 2} ${waistY + 8}, ${rightWaistX} ${waistY}`,
    `C ${rightWaistX - 3} ${waistY - 10}, ${rightBustX + 2} ${bustY + 10}, ${rightBustX} ${bustY}`,
    `C ${rightBustX} ${bustY - 8}, ${rightShoulderX + 3} ${shoulderY + 8}, ${rightShoulderX} ${shoulderY}`,
    `C ${rightShoulderX - 5} ${shoulderY - 2}, ${cx + neckW + 2} ${shoulderY - 3}, ${cx + neckW} ${neckBot}`,
    `L ${cx} ${neckTop}`,
    'Z',
  ].join(' ');

  const labelLineExtension = 12;
  const labelTextOffset = 18;

  const renderProportionLabel = (
    y: number,
    leftX: number,
    rightX: number,
    ratio: number,
    label: string,
  ) => (
    <G key={label}>
      <Line
        x1={leftX - labelLineExtension}
        y1={y}
        x2={leftX}
        y2={y}
        stroke={colors.neutral[400]}
        strokeWidth={0.5}
        strokeDasharray="3,2"
      />
      <Line
        x1={rightX}
        y1={y}
        x2={rightX + labelLineExtension}
        y2={y}
        stroke={colors.neutral[400]}
        strokeWidth={0.5}
        strokeDasharray="3,2"
      />
      <SvgText
        x={rightX + labelTextOffset}
        y={y + 4}
        fontSize={9}
        fontWeight="500"
        fill={colors.neutral[600]}
      >
        {label} {ratio.toFixed(1)}
      </SvgText>
    </G>
  );

  return (
    <View
      accessible={true}
      accessibilityLabel={defaultA11yLabel}
      accessibilityRole="image"
    >
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Circle cx={cx} cy={headCy} r={headR} fill={color} fillOpacity={0.15} stroke={colors.neutral[300]} strokeWidth={1.2} />
        <Path d={bodyPath} fill={color} fillOpacity={0.15} stroke={colors.neutral[300]} strokeWidth={1.2} strokeLinejoin="round" />
        {showLabels && (
          <>
            {renderProportionLabel(shoulderY, leftShoulderX, rightShoulderX, sR, '肩')}
            {renderProportionLabel(waistY, leftWaistX, rightWaistX, wR, '腰')}
            {renderProportionLabel(hipY, leftHipX, rightHipX, hR, '臀')}
          </>
        )}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({});

export default BodySilhouette;
