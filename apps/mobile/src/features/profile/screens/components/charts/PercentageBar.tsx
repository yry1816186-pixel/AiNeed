import React from "react";
import { View, Text } from "react-native";
interface PercentageBarProps {
  value?: number;
  label?: string;
}
export const PercentageBar: React.FC<PercentageBarProps> = () => (
  <View>
    <Text>PercentageBar</Text>
  </View>
);
export default PercentageBar;
