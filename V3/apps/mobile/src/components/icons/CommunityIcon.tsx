import React from 'react';
import { Svg, Path, Circle } from 'react-native-svg';
import { colors } from '../../theme';
import type { IconProps } from './types';

const CommunityIcon: React.FC<IconProps> = ({ size = 32, color = colors.textPrimary, style }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
    <Path
      d="M6 10H18C19.1046 10 20 10.8954 20 12V22C20 23.1046 19.1046 24 18 24H6C4.89543 24 4 23.1046 4 22V12C4 10.8954 4.89543 10 6 10Z"
      stroke={color}
      strokeWidth={1.8}
    />
    <Path
      d="M8 16H16"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
    <Path
      d="M8 20H13"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
    <Circle
      cx="24"
      cy="10"
      r="4"
      stroke={color}
      strokeWidth={1.8}
    />
    <Path
      d="M22 24C22 21.7909 23.7909 20 26 20C28.2091 20 30 21.7909 30 24V26H22V24Z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
  </Svg>
);

export default CommunityIcon;
