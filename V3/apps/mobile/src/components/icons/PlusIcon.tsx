import React from 'react';
import { Svg, Path, Circle } from 'react-native-svg';
import { colors } from '../../theme';
import type { IconProps } from './types';

const PlusIcon: React.FC<IconProps> = ({ size = 24, color = colors.accent, filled = true, style }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <Circle
      cx="12"
      cy="12"
      r="10"
      fill={filled ? color : 'none'}
      stroke={color}
      strokeWidth={1.8}
    />
    <Path
      d="M12 7V17M7 12H17"
      stroke={filled ? colors.white : color}
      strokeWidth={2}
      strokeLinecap="round"
    />
  </Svg>
);

export default PlusIcon;
