import React from 'react';
import { Svg, Path } from 'react-native-svg';
import { colors } from '../../theme';
import type { IconProps } from './types';

const ShareIcon: React.FC<IconProps> = ({ size = 20, color = colors.textPrimary, style }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={style}>
    <Path
      d="M14.5 7C15.8807 7 17 5.88071 17 4.5C17 3.11929 15.8807 2 14.5 2C13.1193 2 12 3.11929 12 4.5C12 4.67259 12.0172 4.84115 12.05 5.00463"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
    <Path
      d="M5.5 8.5C4.11929 8.5 3 9.61929 3 11C3 12.3807 4.11929 13.5 5.5 13.5C6.88071 13.5 8 12.3807 8 11C8 10.8274 7.98282 10.6589 7.95 10.4954"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
    <Path
      d="M14.5 18C15.8807 18 17 16.8807 17 15.5C17 14.1193 15.8807 13 14.5 13C13.1193 13 12 14.1193 12 15.5C12 15.6726 12.0172 15.8411 12.05 16.0046"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
    <Path
      d="M7.9 9.3L12.1 6.7"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
    <Path
      d="M7.9 12.7L12.1 15.3"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
  </Svg>
);

export default ShareIcon;
