import React from "react";
import { View, Text } from "react-native";
interface TypewriterMessageProps {
  message?: string;
}
export const TypewriterMessage: React.FC<TypewriterMessageProps> = () => (
  <View>
    <Text>TypewriterMessage</Text>
  </View>
);
export default TypewriterMessage;
