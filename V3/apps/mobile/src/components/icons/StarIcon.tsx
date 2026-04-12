import React from 'react';
import { Svg, Path } from 'react-native-svg';
import { colors } from '../../theme';
import type { IconProps } from './types';

const StarIcon: React.FC<IconProps> = ({ size = 20, color = colors.textPrimary, filled = false, style }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill={filled ? color : 'none'} style={style}>
    <Path
      d="M10 1.5L12.09 7.22L18.17 7.64L13.47 11.67L14.88 17.58L10 14.27L5.12 17.58L6.53 11.67L1.83 7.64L7.91 7.22L10 1.5Z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
  </Svg>
);

export default StarIcon;
