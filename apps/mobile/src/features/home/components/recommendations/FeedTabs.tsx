import React from "react";
import { View, Text } from "react-native";
interface FeedTabsProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}
export const FeedTabs: React.FC<FeedTabsProps> = () => (
  <View>
    <Text>FeedTabs</Text>
  </View>
);
export default FeedTabs;
