import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { pushNotificationService } from '../services/push-notification.service';
import { deepLinkService } from '../services/deep-link.service';

interface UsePushNotificationOptions {
  onForegroundNotification?: (notification: Notifications.Notification) => void;
}

interface UsePushNotificationReturn {
  expoPushToken: string | null;
  requestPermission: () => Promise<boolean>;
  setBadgeCount: (count: number) => Promise<void>;
}

export function usePushNotification(
  options: UsePushNotificationOptions = {},
): UsePushNotificationReturn {
  const router = useRouter();
  const tokenRef = useRef<string | null>(null);
  const onForegroundRef = useRef(options.onForegroundNotification);

  onForegroundRef.current = options.onForegroundNotification;

  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data;
      const deepLinkUrl = extractDeepLinkFromPayload(data);

      if (deepLinkUrl) {
        const route = deepLinkService.parseUrl(deepLinkUrl);
        if (route) {
          deepLinkService.navigate(route, router);
        }
      }
    },
    [router],
  );

  const handleNotificationReceived = useCallback(
    (notification: Notifications.Notification) => {
      if (onForegroundRef.current) {
        onForegroundRef.current(notification);
      }
    },
    [],
  );

  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const granted = await pushNotificationService.requestPermission();
      if (granted) {
        const token = await pushNotificationService.getExpoPushToken();
        tokenRef.current = token;
        await pushNotificationService.registerToken(token);
      }
      return granted;
    } catch {
      return false;
    }
  }, []);

  const setBadgeCount = useCallback(async (count: number): Promise<void> => {
    await pushNotificationService.setBadgeCount(count);
  }, []);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const granted = await pushNotificationService.requestPermission();
      if (!granted || !mounted) return;

      try {
        const token = await pushNotificationService.getExpoPushToken();
        tokenRef.current = token;
        await pushNotificationService.registerToken(token);
      } catch {
        // token registration failure is non-critical
      }
    };

    init();

    pushNotificationService.onNotificationReceived(handleNotificationReceived);
    pushNotificationService.onNotificationPressed(handleNotificationResponse);

    return () => {
      mounted = false;
      pushNotificationService.removeListeners();
    };
  }, [handleNotificationReceived, handleNotificationResponse]);

  return {
    expoPushToken: tokenRef.current,
    requestPermission,
    setBadgeCount,
  };
}

function extractDeepLinkFromPayload(
  data: unknown,
): string | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const record = data as Record<string, unknown>;

  if (typeof record.deepLink === 'string') {
    return record.deepLink;
  }

  if (typeof record.url === 'string') {
    return record.url;
  }

  if (typeof record.referenceType === 'string' && typeof record.referenceId === 'string') {
    const refType = record.referenceType as string;
    const refId = record.referenceId as string;

    const mapping: Record<string, string> = {
      post: `aineed://post/${refId}`,
      user: `aineed://user/${refId}`,
      design: `aineed://market/design/${refId}`,
      outfit: `aineed://outfit/${refId}`,
      tryon: `aineed://clothing/${refId}`,
      bespoke_order: `aineed://bespoke/studio/${refId}`,
      custom_order: `aineed://clothing/${refId}`,
    };

    return mapping[refType] ?? null;
  }

  return null;
}
