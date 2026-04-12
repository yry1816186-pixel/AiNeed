import React from 'react';
import { Svg, Path } from 'react-native-svg';
import { colors } from '../../theme';
import type { IconProps } from './types';

const OutfitIcon: React.FC<IconProps> = ({ size = 32, color = colors.textPrimary, style }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
    <Path
      d="M10 6L6 10V26H14V18H18V26H26V10L22 6"
      stroke={color}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
    <Path
      d="M10 6L16 12L22 6"
      stroke={color}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
    <Path
      d="M16 12V18"
      stroke={color}
      strokeWidth={1.8}
    />
    <Path
      d="M6 10H26"
      stroke={color}
      strokeWidth={1.8}
    />
  </Svg>
);

export default OutfitIcon;
