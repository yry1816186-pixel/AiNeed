import Taro from "@tarojs/taro";
import { post } from "./request";

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email?: string;
    nickname: string;
    avatar: string | null;
  };
}

/**
 * WeChat mini-program login flow:
 * 1. Taro.login() gets wx code
 * 2. POST /auth/wechat-mini exchanges code for JWT
 * 3. Store tokens in local storage
 */
export async function wechatMiniLogin(): Promise<AuthResponse> {
  const { code } = await Taro.login();
  const res = await post<AuthResponse>("/auth/wechat-mini", { code });

  Taro.setStorageSync("access_token", res.accessToken);
  Taro.setStorageSync("refresh_token", res.refreshToken);

  return res;
}

/**
 * Ensure user is logged in.
 * Returns access token if available, otherwise attempts wx login.
 */
export async function ensureLogin(): Promise<string | null> {
  const token = Taro.getStorageSync("access_token");
  if (token) {
    return token as string;
  }

  try {
    const result = await wechatMiniLogin();
    return result.accessToken;
  } catch {
    return null;
  }
}

/** Check if user has a stored access token */
export function isLoggedIn(): boolean {
  return !!Taro.getStorageSync("access_token");
}

/** Clear all auth tokens */
export function logout(): void {
  Taro.removeStorageSync("access_token");
  Taro.removeStorageSync("refresh_token");
}
