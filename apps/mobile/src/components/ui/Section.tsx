import React from 'react';
import { View, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { Colors, Spacing, Typography } from '../../theme';

export interface SectionProps {
  title: string;
  children: React.ReactNode;
  action?: {
    text: string;
    onPress: () => void;
  };
  style?: ViewStyle;
}

export const Section: React.FC<SectionProps> = ({ title, children, action, style }) => {
  return (
    <View style={[{ marginBottom: Spacing['2xl'] }, style]}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: Spacing.lg,
          paddingHorizontal: Spacing.xl,
        }}
      >
        <Text style={[Typography.heading.lg, { color: Colors.neutral[900] }]}>
          {title}
        </Text>
        {action && (
          <TouchableOpacity onPress={action.onPress} activeOpacity={0.7}>
            <Text
              style={[
                Typography.body.md,
                { color: Colors.primary[600], fontWeight: '600' },
              ]}
            >
              {action.text}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
};

export default Section;
