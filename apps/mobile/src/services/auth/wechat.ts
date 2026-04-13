import { Platform, Linking, Alert } from "react-native";
import apiClient from "../api/client";
import { ApiResponse } from "../../types";
import { User } from "../../types/user";

interface WechatAuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

interface WechatAuthResult {
  code: string;
  state?: string;
}

const WECHAT_APP_ID = process.env.EXPO_PUBLIC_WECHAT_APP_ID || "";
const WECHAT_UNIVERSAL_LINK = process.env.EXPO_PUBLIC_WECHAT_UNIVERSAL_LINK || "";

let isWechatInstalled = false;

async function checkWechatInstalled(): Promise<boolean> {
  if (Platform.OS === "android") {
    try {
      const result = await Linking.canOpenURL("weixin://");
      isWechatInstalled = result;
      return result;
    } catch {
      isWechatInstalled = false;
      return false;
    }
  } else if (Platform.OS === "ios") {
    try {
      const result = await Linking.canOpenURL("weixin://");
      isWechatInstalled = result;
      return result;
    } catch {
      isWechatInstalled = false;
      return false;
    }
  }
  return false;
}

async function authorize(): Promise<WechatAuthResult | null> {
  const installed = await checkWechatInstalled();
  
  if (!installed) {
    Alert.alert(
      "微信未安装",
      "请先安装微信客户端后再使用微信登录",
      [{ text: "知道了" }]
    );
    return null;
  }

  if (!WECHAT_APP_ID) {
    console.warn("WeChat App ID not configured. Using mock auth for development.");
    return mockAuthorize();
  }

  return new Promise((resolve) => {
    try {
      const redirectUri = encodeURIComponent(WECHAT_UNIVERSAL_LINK || "xuno://wechat-callback");
      const state = Math.random().toString(36).substring(7);
      const authUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${WECHAT_APP_ID}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_userinfo&state=${state}#wechat_redirect`;
      
      Linking.openURL(authUrl).catch(() => {
        resolve(null);
      });
      
      const handleOpenURL = (event: { url: string }) => {
        const url = event.url;
        if (url.includes("wechat-callback") || url.includes("code=")) {
          const codeMatch = url.match(/code=([^&]+)/);
          const stateMatch = url.match(/state=([^&]+)/);
          
          if (codeMatch) {
            resolve({
              code: codeMatch[1],
              state: stateMatch?.[1],
            });
          } else {
            resolve(null);
          }
        }
      };

      Linking.addEventListener("url", handleOpenURL);
    } catch {
      resolve(null);
    }
  });
}

function mockAuthorize(): WechatAuthResult {
  return {
    code: `mock_code_${Date.now()}`,
    state: "mock_state",
  };
}

async function loginWithWechat(): Promise<ApiResponse<WechatAuthResponse>> {
  const authResult = await authorize();
  
  if (!authResult) {
    return {
      success: false,
      error: {
        code: "WECHAT_AUTH_CANCELLED",
        message: "微信授权已取消",
      },
    };
  }

  const response = await apiClient.post<WechatAuthResponse>("/auth/wechat/login", {
    code: authResult.code,
  });

  if (response.success && response.data?.accessToken) {
    await apiClient.setToken(response.data.accessToken);
    if (response.data.refreshToken) {
      await apiClient.setRefreshToken(response.data.refreshToken);
    }
  }

  return response;
}

async function shareToWechat(options: {
  title: string;
  description?: string;
  imageUrl?: string;
  webpageUrl?: string;
}): Promise<boolean> {
  const installed = await checkWechatInstalled();
  
  if (!installed) {
    Alert.alert(
      "微信未安装",
      "请先安装微信客户端后再分享",
      [{ text: "知道了" }]
    );
    return false;
  }

  console.log("Share to WeChat:", options);
  return true;
}

export const wechatAuth = {
  checkWechatInstalled,
  authorize,
  getAuthCode: authorize,
  isWechatInstalled: checkWechatInstalled,
  loginWithWechat,
  shareToWechat,
  get isInstalled() {
    return isWechatInstalled;
  },
};

export default wechatAuth;
