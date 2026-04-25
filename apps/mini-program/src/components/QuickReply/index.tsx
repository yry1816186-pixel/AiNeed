import { View, Text, ScrollView } from "@tarojs/components";
import "./index.scss";

interface QuickReplyProps {
  options: string[];
  onSelect: (option: string) => void;
}

/** Horizontal scrollable quick reply buttons */
export default function QuickReply({ options, onSelect }: QuickReplyProps) {
  if (!options || options.length === 0) {
    return null;
  }

  return (
    <ScrollView className="quick-reply" scrollX enableFlex>
      {options.map((option) => (
        <View key={option} className="quick-reply__button" onClick={() => onSelect(option)}>
          <Text className="quick-reply__text">{option}</Text>
        </View>
      ))}
    </ScrollView>
  );
}
