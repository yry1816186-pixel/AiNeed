import React from 'react';
import { Svg, Path } from 'react-native-svg';
import { colors } from '../../theme';
import type { IconProps } from './types';

const FilterIcon: React.FC<IconProps> = ({ size = 20, color = colors.textPrimary, style }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={style}>
    <Path
      d="M2 4H18"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
    <Path
      d="M5 10H15"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
    <Path
      d="M8 16H12"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
  </Svg>
);

export default FilterIcon;
