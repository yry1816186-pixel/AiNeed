import React from "react";
import { View, Text } from "react-native";
interface RecommendationFeedCardProps {
  item?: Record<string, unknown>;
}
export const RecommendationCard: React.FC<RecommendationFeedCardProps> = () => (
  <View>
    <Text>RecommendationCard</Text>
  </View>
);
export default RecommendationCard;
