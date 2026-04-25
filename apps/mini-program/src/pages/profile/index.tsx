import { View, Text, Image, Button } from "@tarojs/components";
import { wechatMiniLogin, isLoggedIn, logout } from "../../services/auth";
import { useUserStore } from "../../store/user";
import "./index.scss";

export default function Profile() {
  const { user, setAuth, clearAuth } = useUserStore();

  const handleLogin = async () => {
    try {
      const result = await wechatMiniLogin();
      setAuth(result.accessToken, {
        id: result.user.id,
        nickname: result.user.nickname,
        avatar: result.user.avatar,
      });
    } catch {
      // Login failed silently
    }
  };

  const handleLogout = () => {
    logout();
    clearAuth();
  };

  const loggedIn = isLoggedIn();

  return (
    <View className="profile">
      {loggedIn && user ? (
        <View className="profile__info">
          {user.avatar ? (
            <Image className="profile__avatar" src={user.avatar} mode="aspectFill" />
          ) : (
            <View className="profile__avatar-placeholder">
              <Text className="profile__avatar-text">
                {(user.nickname || "?")[0].toUpperCase()}
              </Text>
            </View>
          )}
          <Text className="profile__nickname">{user.nickname}</Text>
          <View className="profile__logout-btn" onClick={handleLogout}>
            <Text className="profile__logout-text">退出登录</Text>
          </View>
        </View>
      ) : (
        <View className="profile__login">
          <View className="profile__login-avatar">
            <Text className="profile__login-avatar-text">?</Text>
          </View>
          <Text className="profile__login-title">登录寻裳</Text>
          <Text className="profile__login-desc">登录后解锁 AI 穿搭搭子全部功能</Text>
          <Button className="profile__login-btn" openType="getUserInfo" onClick={handleLogin}>
            <Text className="profile__login-btn-text">微信登录</Text>
          </Button>
        </View>
      )}
    </View>
  );
}
