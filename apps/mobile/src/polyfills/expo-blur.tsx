import React from 'react';
import { View, ViewStyle, StyleProp, StyleSheet } from 'react-native';

export interface BlurViewProps {
  intensity?: number;
  tint?: 'light' | 'dark' | 'default' | 'extraLight';
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export const BlurView: React.FC<BlurViewProps> = ({ 
  intensity = 50, 
  tint = 'default', 
  style, 
  children 
}) => {
  const backgroundColor = tint === 'dark' 
    ? 'rgba(0, 0, 0, 0.5)' 
    : tint === 'light' 
      ? 'rgba(255, 255, 255, 0.5)'
      : tint === 'extraLight'
        ? 'rgba(255, 255, 255, 0.3)'
        : 'rgba(128, 128, 128, 0.3)';
  
  return (
    <View style={[styles.blurView, { backgroundColor }, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  blurView: {
    flex: 1,
  },
});

export default { BlurView };
