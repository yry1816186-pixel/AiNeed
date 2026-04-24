import React from "react";
import { View, Text } from "react-native";
interface TagCloudProps {
  tags?: string[];
}
export const TagCloud: React.FC<TagCloudProps> = () => (
  <View>
    <Text>TagCloud</Text>
  </View>
);
export default TagCloud;
