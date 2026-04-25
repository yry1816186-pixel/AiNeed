import { View, Text } from "@tarojs/components";
import Taro, { useShareAppMessage, useShareTimeline } from "@tarojs/taro";
import YiyiAvatar from "../../components/YiyiAvatar";
import { useUserStore } from "../../store/user";
import "./index.scss";

export default function Index() {
  const user = useUserStore((s) => s.user);

  // Share to chat/groups
  useShareAppMessage(() => ({
    title: "拍照找同款，AI 帮你搭更好",
    path: "/pages/index/index",
  }));

  // Share to Moments (Android)
  useShareTimeline(() => ({
    title: "拍照找同款，AI 帮你搭更好",
    query: "",
  }));

  /** Photo search entry: choose image then navigate to search */
  const handlePhotoSearch = () => {
    Taro.chooseImage({
      count: 1,
      sizeType: ["compressed"],
      sourceType: ["album", "camera"],
      success: (res) => {
        const tempPath = res.tempFilePaths[0];
        Taro.navigateTo({
          url: `/pages/search/index?imageUrl=${encodeURIComponent(tempPath)}`,
        });
      },
    });
  };

  /** Navigate to Yiyi chat */
  const handleQuickChat = () => {
    Taro.navigateTo({ url: "/pages/chat/index" });
  };

  const greeting = user?.nickname ? `Hi, ${user.nickname}` : "Hi, I'm Yiyi";

  return (
    <View className="index">
      <View className="index__header">
        <YiyiAvatar size="large" />
        <Text className="index__greeting">{greeting}</Text>
        <Text className="index__subtitle">你的 AI 穿搭搭子</Text>
      </View>

      <View className="index__actions">
        <View className="index__action-card" onClick={handlePhotoSearch}>
          <Text className="index__action-icon">{"📷"}</Text>
          <Text className="index__action-title">拍照找同款</Text>
          <Text className="index__action-desc">拍一张照片，AI 帮你找到同款</Text>
        </View>

        <View className="index__action-card" onClick={handleQuickChat}>
          <Text className="index__action-icon">{"💬"}</Text>
          <Text className="index__action-title">问问伊伊</Text>
          <Text className="index__action-desc">穿搭问题，随时问我</Text>
        </View>
      </View>
    </View>
  );
}
