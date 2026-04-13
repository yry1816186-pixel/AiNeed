import { Linking } from 'react-native';
import { useAuthStore } from '../stores';
import { navigate } from '../navigation/navigation';
import { parseDeepLink } from '../navigation/deeplinks';
import type { RootStackParamList } from '../types/navigation';

interface PendingDeepLink {
  screen: keyof RootStackParamList;
  params: Record<string, unknown> | undefined;
}

let pendingDeepLink: PendingDeepLink | null = null;
let linkingListener: { remove: () => void } | null = null;

function navigateToScreen(
  screen: keyof RootStackParamList,
  params: Record<string, unknown> | undefined,
): void {
  navigate(
    screen,
    params as RootStackParamList[keyof RootStackParamList],
  );
}

export const DeepLinkService = {
  initialize: () => {
    linkingListener = Linking.addEventListener('url', (event) => {
      DeepLinkService.handleDeepLink(event.url);
    });

    Linking.getInitialURL().then((url) => {
      if (url) {
        DeepLinkService.handleDeepLink(url);
      }
    });
  },

  handleDeepLink: (url: string) => {
    const result = parseDeepLink(url);
    if (!result) {
      return;
    }

    const isAuthenticated = useAuthStore.getState().isAuthenticated;

    if (!isAuthenticated) {
      pendingDeepLink = { screen: result.screen, params: result.params };
      navigate('Login');
      return;
    }

    navigateToScreen(result.screen, result.params);
  },

  cleanup: () => {
    if (linkingListener) {
      linkingListener.remove();
      linkingListener = null;
    }
  },
};

export function getAndClearPendingDeepLink(): PendingDeepLink | null {
  const link = pendingDeepLink;
  pendingDeepLink = null;
  return link;
}

export function executePendingDeepLink(): void {
  if (!pendingDeepLink) {
    return;
  }

  const link = pendingDeepLink;
  pendingDeepLink = null;
  navigateToScreen(link.screen, link.params);
}
