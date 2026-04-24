import React from "react";
import { View, Text } from "react-native";
interface QuizProgressProps {
  currentStep?: number;
  totalSteps?: number;
}
export const QuizProgress: React.FC<QuizProgressProps> = () => (
  <View>
    <Text>QuizProgress</Text>
  </View>
);
export default QuizProgress;
