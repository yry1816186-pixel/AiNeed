import React from 'react';
import { Svg, Path, Circle, Rect } from 'react-native-svg';
import { colors } from '../../theme';
import type { IconProps } from './types';

const CameraIcon: React.FC<IconProps> = ({ size = 20, color = colors.textPrimary, style }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={style}>
    <Path
      d="M6.5 4L7.5 2H12.5L13.5 4"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Rect
      x="2"
      y="4"
      width="16"
      height="13"
      rx="2"
      stroke={color}
      strokeWidth={1.8}
    />
    <Circle
      cx="10"
      cy="10.5"
      r="3.5"
      stroke={color}
      strokeWidth={1.8}
    />
  </Svg>
);

export default CameraIcon;
