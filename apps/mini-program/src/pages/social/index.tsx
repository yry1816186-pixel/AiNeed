import { View, Text, ScrollView } from "@tarojs/components";
import { useState, useEffect } from "react";
import Taro, { useShareAppMessage } from "@tarojs/taro";
import StyleMatchCard from "../../components/StyleMatchCard";
import { getStyleMatches, type StyleMatch } from "../../services/social";
import { isLoggedIn, wechatMiniLogin } from "../../services/auth";
import { useUserStore } from "../../store/user";
import "./index.scss";

/** Skeleton placeholder for loading state */
function SkeletonMatchCard() {
  return (
    <View className="social__skeleton-card">
      <View className="social__skeleton-avatar" />
      <View className="social__skeleton-content">
        <View className="social__skeleton-line social__skeleton-line--long" />
        <View className="social__skeleton-line social__skeleton-line--medium" />
      </View>
    </View>
  );
}

export default function Social() {
  const [matches, setMatches] = useState<StyleMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const token = useUserStore((s) => s.token);

  /** Load style DNA matches */
  const loadMatches = async () => {
    setLoading(true);
    setNeedsLogin(false);

    try {
      const response = await getStyleMatches(10);
      setMatches(response.matches || []);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "";
      if (errorMsg === "Unauthorized") {
        setNeedsLogin(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check login status before loading
    if (!isLoggedIn()) {
      setNeedsLogin(true);
      setLoading(false);
      return;
    }

    loadMatches();
  }, [token]);

  /** Handle login button click */
  const handleLogin = async () => {
    try {
      const result = await wechatMiniLogin();
      const store = useUserStore.getState();
      store.setAuth(result.accessToken, {
        id: result.user.id,
        nickname: result.user.nickname,
        avatar: result.user.avatar,
      });
      setNeedsLogin(false);
      // Reload matches after login
      setLoading(true);
      try {
        const response = await getStyleMatches(10);
        setMatches(response.matches || []);
      } catch {
        // Silently fail after login
      } finally {
        setLoading(false);
      }
    } catch {
      Taro.showToast({
        title: "登录失败，请重试",
        icon: "none",
        duration: 2000,
      });
    }
  };

  /** Share to WeChat contacts */
  useShareAppMessage(() => ({
    title: "找到我的风格搭子了！来看看你的风格 DNA",
    path: "/pages/index/index",
  }));

  return (
    <View className="social">
      {/* Login prompt */}
      {needsLogin && !loading && (
        <View className="social__login-prompt">
          <Text className="social__login-title">发现你的风格搭子</Text>
          <Text className="social__login-desc">登录后查看与你品味最搭的人</Text>
          <View className="social__login-btn" onClick={handleLogin}>
            <Text className="social__login-btn-text">微信一键登录</Text>
          </View>
        </View>
      )}

      {/* Loading skeleton */}
      {loading && (
        <View className="social__matches">
          <Text className="social__section-title">风格匹配中...</Text>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonMatchCard key={i} />
          ))}
        </View>
      )}

      {/* Match results */}
      {!loading && !needsLogin && matches.length > 0 && (
        <ScrollView className="social__matches" scrollY>
          <Text className="social__section-title">与你风格最搭的 {matches.length} 个人</Text>

          {matches.map((match) => (
            <StyleMatchCard key={match.userId} match={match} />
          ))}
        </ScrollView>
      )}

      {/* Empty state for cold-start users */}
      {!loading && !needsLogin && matches.length === 0 && (
        <View className="social__empty">
          <Text className="social__empty-icon">{"🧬"}</Text>
          <Text className="social__empty-title">还没有风格数据</Text>
          <Text className="social__empty-hint">多和伊伊聊聊，就能找到你的风格搭子啦~</Text>
          <View
            className="social__empty-btn"
            onClick={() => Taro.navigateTo({ url: "/pages/chat/index" })}
          >
            <Text className="social__empty-btn-text">去和伊伊聊聊</Text>
          </View>
        </View>
      )}
    </View>
  );
}
