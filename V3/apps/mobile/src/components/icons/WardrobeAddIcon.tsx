import React from 'react';
import { Svg, Path, Circle } from 'react-native-svg';
import { colors } from '../../theme';
import type { IconProps } from './types';

const WardrobeAddIcon: React.FC<IconProps> = ({ size = 32, color = colors.textPrimary, style }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
    <Path
      d="M6 4H20C21.1046 4 22 4.89543 22 6V26C22 27.1046 21.1046 28 20 28H6C4.89543 28 4 27.1046 4 26V6C4 4.89543 4.89543 4 6 4Z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
    <Path
      d="M13 4V28"
      stroke={color}
      strokeWidth={1.8}
    />
    <Path
      d="M4 10H22"
      stroke={color}
      strokeWidth={1.8}
    />
    <Circle cx="9.5" cy="7" r="0.8" fill={color} />
    <Circle cx="16.5" cy="7" r="0.8" fill={color} />
    <Circle
      cx="25"
      cy="22"
      r="6"
      stroke={color}
      strokeWidth={1.8}
    />
    <Path
      d="M25 19V25M22 22H28"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
  </Svg>
);

export default WardrobeAddIcon;
