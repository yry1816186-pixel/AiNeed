import React from 'react';
import { View, ViewStyle } from 'react-native';
import { Spacing } from '../../theme';

export interface RowProps {
  children: React.ReactNode;
  style?: ViewStyle;
  gap?: number;
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  justify?:
    | 'flex-start'
    | 'center'
    | 'flex-end'
    | 'space-between'
    | 'space-around';
}

export const Row: React.FC<RowProps> = ({
  children,
  style,
  gap = Spacing.sm,
  align = 'center',
  justify = 'flex-start',
}) => {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: align,
          justifyContent: justify,
          gap,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

export default Row;
