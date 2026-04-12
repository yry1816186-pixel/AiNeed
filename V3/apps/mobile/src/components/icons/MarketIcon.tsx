import React from 'react';
import { Svg, Path, Rect } from 'react-native-svg';
import { colors } from '../../theme';
import type { IconProps } from './types';

const MarketIcon: React.FC<IconProps> = ({ size = 32, color = colors.textPrimary, style }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
    <Path
      d="M4 12L6 4H26L28 12"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Rect
      x="4"
      y="12"
      width="24"
      height="16"
      rx="2"
      stroke={color}
      strokeWidth={1.8}
    />
    <Path
      d="M12 12V28"
      stroke={color}
      strokeWidth={1.8}
    />
    <Path
      d="M20 12V28"
      stroke={color}
      strokeWidth={1.8}
    />
    <Path
      d="M4 20H28"
      stroke={color}
      strokeWidth={1.8}
    />
    <Path
      d="M12 4L16 12L20 4"
      stroke={color}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
  </Svg>
);

export default MarketIcon;
