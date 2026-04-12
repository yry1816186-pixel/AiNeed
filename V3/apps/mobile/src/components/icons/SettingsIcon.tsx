import React from 'react';
import { Svg, Path, Circle } from 'react-native-svg';
import { colors } from '../../theme';
import type { IconProps } from './types';

const SettingsIcon: React.FC<IconProps> = ({ size = 20, color = colors.textPrimary, style }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={style}>
    <Circle cx="10" cy="10" r="3" stroke={color} strokeWidth={1.8} />
    <Path
      d="M10 1.5V3.5M10 16.5V18.5M1.5 10H3.5M16.5 10H18.5M3.93 3.93L5.35 5.35M14.65 14.65L16.07 16.07M3.93 16.07L5.35 14.65M14.65 5.35L16.07 3.93"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
  </Svg>
);

export default SettingsIcon;
