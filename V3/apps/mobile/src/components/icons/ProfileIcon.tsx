import React from 'react';
import { Svg, Path, Circle } from 'react-native-svg';
import { colors } from '../../theme';
import type { IconProps } from './types';

const ProfileIcon: React.FC<IconProps> = ({ size = 24, color = colors.textPrimary, filled = false, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Circle
      cx="12"
      cy="8"
      r="4"
      fill={filled ? color : 'none'}
      stroke={color}
      strokeWidth={1.8}
    />
    <Path
      d="M4 21C4 16.5817 7.58172 13 12 13C16.4183 13 20 16.5817 20 21"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
  </Svg>
);

export default ProfileIcon;
