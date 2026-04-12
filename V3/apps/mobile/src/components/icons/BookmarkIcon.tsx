import React from 'react';
import { Svg, Path } from 'react-native-svg';
import { colors } from '../../theme';
import type { IconProps } from './types';

const BookmarkIcon: React.FC<IconProps> = ({ size = 20, color = colors.textPrimary, filled = false, style }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill={filled ? color : 'none'} style={style}>
    <Path
      d="M4 3.5C4 2.94772 4.44772 2.5 5 2.5H15C15.5523 2.5 16 2.94772 16 3.5V17.5L10 14L4 17.5V3.5Z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
  </Svg>
);

export default BookmarkIcon;
