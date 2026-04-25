import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { wechatMiniLogin } from "../../services/auth";
import { useUserStore } from "../../store/user";

/**
 * Registration CTA card for anonymous users.
 * Shows at bottom of search results to convert to logged-in users.
 */
export default function RegistrationCTA() {
  const token = useUserStore((s) => s.token);

  // Don't show CTA if user is already logged in
  if (token) {
    return null;
  }

  const handleLogin = async () => {
    try {
      const result = await wechatMiniLogin();
      const store = useUserStore.getState();
      store.setAuth(result.accessToken, {
        id: result.user.id,
        nickname: result.user.nickname,
        avatar: result.user.avatar,
      });

      Taro.showToast({
        title: "解锁成功",
        icon: "success",
        duration: 1500,
      });
    } catch {
      Taro.showToast({
        title: "登录失败，请重试",
        icon: "none",
        duration: 2000,
      });
    }
  };

  return (
    <View className="registration-cta">
      <View className="registration-cta__content">
        <Text className="registration-cta__title">AI 帮你搭更好</Text>
        <Text className="registration-cta__desc">一键解锁伊伊的完整穿搭建议</Text>
      </View>

      <View className="registration-cta__button" onClick={handleLogin}>
        <Text className="registration-cta__button-text">微信一键解锁</Text>
      </View>
    </View>
  );
}
