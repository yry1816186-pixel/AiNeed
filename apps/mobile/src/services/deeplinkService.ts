import { Linking } from 'react-native';
import { useAuthStore } from '../stores';
import { navigateDeepLink } from '../navigation/navigationService';

export const DeepLinkService = {
  initialize: () => {
    const linkingListener = Linking.addEventListener('url', (event) => {
      DeepLinkService.handleDeepLink(event.url);
    });

    Linking.getInitialURL().then((url) => {
      if (url) {
        DeepLinkService.handleDeepLink(url);
      }
    });

    return linkingListener;
  },

  handleDeepLink: (url: string) => {
    const isAuthenticated = useAuthStore.getState().isAuthenticated;
    navigateDeepLink(url, isAuthenticated);
  },

  cleanup: (listener?: { remove: () => void } | null) => {
    if (listener) {
      listener.remove();
    }
  },
};
