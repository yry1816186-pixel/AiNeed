import React from 'react';
import { Svg, Path, Rect } from 'react-native-svg';
import { colors } from '../../theme';
import type { IconProps } from './types';

const ImageIcon: React.FC<IconProps> = ({ size = 20, color = colors.textPrimary, style }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={style}>
    <Rect
      x="2"
      y="3"
      width="16"
      height="14"
      rx="2"
      stroke={color}
      strokeWidth={1.8}
    />
    <Path
      d="M2 13L6.5 9L10 12L14 7L18 11"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M13 6.5C13 5.94772 13.4477 5.5 14 5.5C14.5523 5.5 15 5.94772 15 6.5C15 7.05228 14.5523 7.5 14 7.5C13.4477 7.5 13 7.05228 13 6.5Z"
      fill={color}
    />
  </Svg>
);

export default ImageIcon;
