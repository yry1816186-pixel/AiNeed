import { View, Text } from "@tarojs/components";
import "./index.scss";

interface YiyiAvatarProps {
  size?: "small" | "medium" | "large";
}

/** Yiyi avatar: warm-camel circle with hanger icon (text-based) */
export default function YiyiAvatar({ size = "medium" }: YiyiAvatarProps) {
  const sizeClass = `avatar-${size}`;

  return (
    <View className={`yiyi-avatar ${sizeClass}`}>
      <Text className="yiyi-avatar__icon">h</Text>
    </View>
  );
}
