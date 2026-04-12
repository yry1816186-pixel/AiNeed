import { Share, Alert, Linking as RNLinking, Platform } from 'react-native';
import type { DeepLinkRoute } from '../services/deep-link.service';

const APP_SCHEME = 'aineed';
const WEB_BASE_URL = 'https://aineed.app';
const IOS_UNIVERSAL_LINK_BASE = 'https://aineed.app';
const WECHAT_SHARE_URL = 'weixin://';

function routeToPath(route: DeepLinkRoute): string {
  switch (route.path) {
    case 'clothing':
      return `/clothing/${route.id}`;
    case 'outfit':
      return `/outfit/${route.id}`;
    case 'post':
      return `/post/${route.id}`;
    case 'user':
      return `/user/${route.id}`;
    case 'market/design':
      return `/market/design/${route.id}`;
    case 'bespoke/studio':
      return `/bespoke/studio/${route.id}`;
    case 'stylist':
      return '/stylist';
  }
}

export function buildWebUrl(route: DeepLinkRoute): string {
  return `${WEB_BASE_URL}${routeToPath(route)}`;
}

export function buildAppUrl(route: DeepLinkRoute): string {
  return `${APP_SCHEME}://${routeToPath(route).slice(1)}`;
}

export function buildUniversalLink(route: DeepLinkRoute): string {
  return `${IOS_UNIVERSAL_LINK_BASE}${routeToPath(route)}`;
}

export async function shareToWeChat(title: string, description: string, url: string): Promise<void> {
  const canOpen = await RNLinking.canOpenURL(WECHAT_SHARE_URL);
  if (!canOpen) {
    Alert.alert('提示', '请先安装微信', [{ text: '确定' }]);
    return;
  }

  try {
    await Share.share(
      {
        title,
        message: `${title}\n${description}\n${url}`,
        url,
      },
      {
        subject: title,
      },
    );
  } catch {
    Alert.alert('分享失败', '无法分享到微信，请重试', [{ text: '确定' }]);
  }
}

export async function shareToNative(title: string, url: string): Promise<void> {
  try {
    await Share.share(
      {
        title,
        message: Platform.OS === 'android' ? url : title,
        url: Platform.OS === 'ios' ? url : undefined,
      },
      {
        subject: title,
      },
    );
  } catch {
    Alert.alert('分享失败', '无法打开分享面板，请重试', [{ text: '确定' }]);
  }
}
