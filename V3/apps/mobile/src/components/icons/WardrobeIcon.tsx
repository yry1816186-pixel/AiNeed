import React from 'react';
import { Svg, Path, Circle } from 'react-native-svg';
import { colors } from '../../theme';
import type { IconProps } from './types';

const WardrobeIcon: React.FC<IconProps> = ({ size = 24, color = colors.textPrimary, filled = false, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Path
      d="M6 3H18C18.5523 3 19 3.44772 19 4V20C19 20.5523 18.5523 21 18 21H6C5.44772 21 5 20.5523 5 20V4C5 3.44772 5.44772 3 6 3Z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
    <Path
      d="M12 3V21"
      stroke={color}
      strokeWidth={1.8}
    />
    <Path
      d="M5 8H19"
      stroke={color}
      strokeWidth={1.8}
    />
    <Circle cx="10" cy="5.5" r="0.8" fill={color} />
    <Circle cx="14" cy="5.5" r="0.8" fill={color} />
  </Svg>
);

export default WardrobeIcon;
