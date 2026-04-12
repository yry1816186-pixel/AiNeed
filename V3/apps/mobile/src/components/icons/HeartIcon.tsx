import React from 'react';
import { Svg, Path } from 'react-native-svg';
import { colors } from '../../theme';
import type { IconProps } from './types';

const HeartIcon: React.FC<IconProps> = ({ size = 20, color = colors.textPrimary, filled = false, style }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill={filled ? color : 'none'} style={style}>
    <Path
      d="M10 17.5C10 17.5 2.5 12.5 2.5 7.5C2.5 4.73858 4.73858 2.5 7.5 2.5C8.80428 2.5 9.99339 3.00375 10.8824 3.82918C10.9219 3.86558 10.9609 3.90258 11 3.94C11.0391 3.90258 11.0781 3.86558 11.1176 3.82918C12.0066 3.00375 13.1957 2.5 14.5 2.5C17.2614 2.5 19.5 4.73858 19.5 7.5C19.5 12.5 12 17.5 12 17.5C11.4477 17.8667 10.5523 17.8667 10 17.5Z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
  </Svg>
);

export default HeartIcon;
