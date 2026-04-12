import React from 'react';
import { Svg, Path, Circle } from 'react-native-svg';
import { colors } from '../../theme';
import type { IconProps } from './types';

const SearchIcon: React.FC<IconProps> = ({ size = 20, color = colors.textPrimary, style }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={style}>
    <Circle
      cx="8.5"
      cy="8.5"
      r="5.5"
      stroke={color}
      strokeWidth={1.8}
    />
    <Path
      d="M13 13L17 17"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
  </Svg>
);

export default SearchIcon;
