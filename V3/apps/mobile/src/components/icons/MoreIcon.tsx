import React from 'react';
import { Svg, Circle } from 'react-native-svg';
import { colors } from '../../theme';
import type { IconProps } from './types';

const MoreIcon: React.FC<IconProps> = ({ size = 20, color = colors.textPrimary, style }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={style}>
    <Circle cx="4" cy="10" r="1.5" fill={color} />
    <Circle cx="10" cy="10" r="1.5" fill={color} />
    <Circle cx="16" cy="10" r="1.5" fill={color} />
  </Svg>
);

export default MoreIcon;
