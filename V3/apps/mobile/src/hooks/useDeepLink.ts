import { useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { deepLinkService } from '../services/deep-link.service';

interface UseDeepLinkOptions {
  onDeepLink?: (url: string) => void;
}

export function useDeepLink(options: UseDeepLinkOptions = {}): void {
  const router = useRouter();

  const handleUrl = useCallback(
    (url: string) => {
      if (options.onDeepLink) {
        options.onDeepLink(url);
      }

      const route = deepLinkService.parseUrl(url);
      if (route) {
        deepLinkService.navigate(route, router);
      }
    },
    [router, options.onDeepLink],
  );

  useEffect(() => {
    Linking.getInitialURL().then((initialUrl: string | null) => {
      if (initialUrl) {
        handleUrl(initialUrl);
      }
    });

    const subscription = Linking.addEventListener('url', (event: { url: string }) => {
      handleUrl(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [handleUrl]);
}
