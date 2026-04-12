import React from 'react';
import { Svg, Path } from 'react-native-svg';
import { colors } from '../../theme';
import type { IconProps } from './types';

const StylistIcon: React.FC<IconProps> = ({ size = 24, color = colors.textPrimary, filled = false, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} style={style}>
    <Path
      d="M15 4V10L17 8M15 4L13 6M15 4H15.5C18 4 20 6 20 8.5C20 11 18 13 15.5 13H14"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M9 20V14L7 16M9 20L11 18M9 20H8.5C6 20 4 18 4 15.5C4 13 6 11 8.5 11H10"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M17.5 5L19 2"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
    <Path
      d="M6.5 19L5 22"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
  </Svg>
);

export default StylistIcon;
