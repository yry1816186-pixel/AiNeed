import { Platform } from "react-native";
import { notificationApi } from "./api/notification.api";
import { secureStorage, SECURE_STORAGE_KEYS } from "../utils/secureStorage";

const PUSH_TOKEN_KEY = "@xuno_push_token";

/**
 * Mobile push notification service.
 * Handles permission request, token registration, and notification handling.
 * Gracefully degrades when Firebase is not configured (dev environment).
 */
class PushNotificationService {
  private token: string | null = null;
  private initialized = false;

  /**
   * Initialize push notification service.
   * Call this once on app startup.
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Try to load existing token
      const storedToken = await secureStorage.getItem(PUSH_TOKEN_KEY);
      if (storedToken) {
        this.token = storedToken;
      }

      this.initialized = true;
    } catch (error) {
      console.warn("[PushNotification] Initialize failed:", error);
    }
  }

  /**
   * Request notification permission from the OS.
   * Returns true if permission granted.
   */
  async requestPermission(): Promise<boolean> {
    try {
      // Try to use Firebase messaging if available
      const messaging = this.getFirebaseMessaging();
      if (messaging) {
        const authStatus = await messaging.requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;
        return enabled;
      }

      // Fallback: on iOS, use PushNotificationIOS
      if (Platform.OS === "ios") {
        const PushNotificationIOS = require("@react-native-community/push-notification-ios").default;
        return new Promise((resolve) => {
          PushNotificationIOS.requestPermissions({ alert: true, badge: true, sound: true })
            .then((permissions: { alert?: boolean }) => {
              resolve(!!permissions.alert);
            })
            .catch(() => resolve(false));
        });
      }

      // Android: permissions are granted by default for push notifications
      return true;
    } catch (error) {
      console.warn("[PushNotification] Permission request failed:", error);
      return false;
    }
  }

  /**
   * Get the current push token and register with backend.
   */
  async getAndRegisterToken(): Promise<string | null> {
    try {
      const messaging = this.getFirebaseMessaging();
      if (messaging) {
        const token = await messaging.getToken();
        if (token) {
          this.token = token;
          await secureStorage.setItem(PUSH_TOKEN_KEY, token);
          await this.registerTokenWithBackend(token);
          return token;
        }
      }

      // If no Firebase, return null (push not available in dev)
      return null;
    } catch (error) {
      console.warn("[PushNotification] Get token failed:", error);
      return null;
    }
  }

  /**
   * Register the token with the backend API.
   */
  private async registerTokenWithBackend(token: string): Promise<void> {
    try {
      const platform = Platform.OS === "ios" ? "ios" : "android";
      await notificationApi.registerDeviceToken(token, platform);
    } catch (error) {
      console.warn("[PushNotification] Backend registration failed:", error);
    }
  }

  /**
   * Deregister the current token from the backend (e.g., on logout).
   */
  async deregisterToken(): Promise<void> {
    if (!this.token) return;

    try {
      await notificationApi.deregisterDeviceToken(this.token);
    } catch (error) {
      console.warn("[PushNotification] Backend deregistration failed:", error);
    } finally {
      this.token = null;
      await secureStorage.deleteItem(PUSH_TOKEN_KEY);
    }
  }

  /**
   * Listen for foreground push notifications.
   * Returns an unsubscribe function.
   */
  onNotificationReceived(
    callback: (notification: {
      title?: string;
      body?: string;
      data?: Record<string, unknown>;
    }) => void,
  ): () => void {
    try {
      const messaging = this.getFirebaseMessaging();
      if (messaging) {
        return messaging.onMessage(async (remoteMessage: Record<string, unknown>) => {
          const notification = remoteMessage.notification as { title?: string; body?: string } | undefined;
          callback({
            title: notification?.title,
            body: notification?.body,
            data: (remoteMessage.data as Record<string, unknown>) || {},
          });
        });
      }
    } catch (error) {
      console.warn("[PushNotification] onMessage setup failed:", error);
    }
    return () => {};
  }

  /**
   * Listen for notification opened (app opened from notification tap).
   * Returns an unsubscribe function.
   */
  onNotificationOpened(
    callback: (notification: {
      title?: string;
      body?: string;
      data?: Record<string, unknown>;
    }) => void,
  ): () => void {
    try {
      const messaging = this.getFirebaseMessaging();
      if (messaging) {
        // App in foreground when notification tapped
        const unsub1 = messaging.onNotificationOpenedApp(
          (remoteMessage: Record<string, unknown>) => {
            const notification = remoteMessage.notification as { title?: string; body?: string } | undefined;
            callback({
              title: notification?.title,
              body: notification?.body,
              data: (remoteMessage.data as Record<string, unknown>) || {},
            });
          },
        );

        // App opened from quit state by notification tap
        messaging.getInitialNotification().then(
          (remoteMessage: Record<string, unknown> | null) => {
            if (remoteMessage) {
              const notification = remoteMessage.notification as { title?: string; body?: string } | undefined;
              callback({
                title: notification?.title,
                body: notification?.body,
                data: (remoteMessage.data as Record<string, unknown>) || {},
              });
            }
          },
        );

        return unsub1;
      }
    } catch (error) {
      console.warn("[PushNotification] onNotificationOpened setup failed:", error);
    }
    return () => {};
  }

  /**
   * Try to get Firebase messaging module.
   * Returns null if not available (e.g., not configured in dev).
   */
  private getFirebaseMessaging(): {
    getToken: () => Promise<string>;
    requestPermission: () => Promise<number>;
    AuthorizationStatus: { AUTHORIZED: number; PROVISIONAL: number };
    onMessage: (cb: (msg: Record<string, unknown>) => void) => () => void;
    onNotificationOpenedApp: (cb: (msg: Record<string, unknown>) => void) => () => void;
    getInitialNotification: () => Promise<Record<string, unknown> | null>;
  } | null {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports
      const messaging = require("@react-native-firebase/messaging").default;
      return messaging();
    } catch {
      return null;
    }
  }
}

export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
