import React from 'react';
import { Svg, Path } from 'react-native-svg';
import { colors } from '../../theme';
import type { IconProps } from './types';

const TryOnIcon: React.FC<IconProps> = ({ size = 32, color = colors.textPrimary, style }) => (
  <Svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={style}>
    <Path
      d="M16 4C13.7909 4 12 5.79086 12 8V12C12 14.2091 13.7909 16 16 16C18.2091 16 20 14.2091 20 12V8C20 5.79086 18.2091 4 16 4Z"
      stroke={color}
      strokeWidth={1.8}
    />
    <Path
      d="M8 28C8 22.4772 11.5817 18 16 18C20.4183 18 24 22.4772 24 28"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
    <Path
      d="M10 12H6L4 18H10"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M22 12H26L28 18H22"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

export default TryOnIcon;
