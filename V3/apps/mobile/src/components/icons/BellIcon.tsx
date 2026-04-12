import React from 'react';
import { Svg, Path, Circle } from 'react-native-svg';
import { colors } from '../../theme';
import type { IconProps } from './types';

interface BellIconProps extends IconProps {
  showBadge?: boolean;
}

const BellIcon: React.FC<BellIconProps> = ({ size = 20, color = colors.textPrimary, style, showBadge = false }) => (
  <Svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={style}>
    <Path
      d="M10 2C7.23858 2 5 4.23858 5 7V11L3 14H17L15 11V7C15 4.23858 12.7614 2 10 2Z"
      stroke={color}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
    <Path
      d="M8 16C8 17.1046 8.89543 18 10 18C11.1046 18 12 17.1046 12 16"
      stroke={color}
      strokeWidth={1.8}
      strokeLinecap="round"
    />
    {showBadge && (
      <Circle cx="15" cy="4" r="3" fill={colors.accent} />
    )}
  </Svg>
);

export default BellIcon;
