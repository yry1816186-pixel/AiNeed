import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type NotificationReceivedHandler = (notification: Notifications.Notification) => void;
type NotificationResponseHandler = (response: Notifications.NotificationResponse) => void;

class PushNotificationService {
  private receivedSubscription: Notifications.EventSubscription | null = null;
  private responseSubscription: Notifications.EventSubscription | null = null;

  async requestPermission(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus === 'granted') {
      return true;
    }

    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        allowAnnouncements: true,
      } as Notifications.IosNotificationPermissionsRequest,
    });

    return status === 'granted';
  }

  async getExpoPushToken(): Promise<string> {
    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      throw new Error('推送通知权限未授予');
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId: 'aineed',
    });

    if (Platform.OS === 'android') {
      this.setupAndroidChannels();
    }

    return token;
  }

  async registerToken(token: string): Promise<void> {
    await api.post('/notifications/register-token', {
      platform: Platform.OS,
      token,
    });
  }

  setupAndroidChannels(): void {
    if (Platform.OS !== 'android') {
      return;
    }

    Notifications.setNotificationChannelAsync('default', {
      name: '默认',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6C5CE7',
      sound: 'default',
    });

    Notifications.setNotificationChannelAsync('stylist', {
      name: 'AI造型师',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6C5CE7',
      sound: 'default',
    });

    Notifications.setNotificationChannelAsync('order', {
      name: '订单通知',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00B894',
      sound: 'default',
    });

    Notifications.setNotificationChannelAsync('social', {
      name: '社交互动',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#E17055',
      sound: 'default',
    });
  }

  onNotificationReceived(handler: NotificationReceivedHandler): void {
    this.receivedSubscription = Notifications.addNotificationReceivedListener(handler);
  }

  onNotificationPressed(handler: NotificationResponseHandler): void {
    this.responseSubscription = Notifications.addNotificationResponseReceivedListener(handler);
  }

  async setBadgeCount(count: number): Promise<void> {
    await Notifications.setBadgeCountAsync(count);
  }

  removeListeners(): void {
    if (this.receivedSubscription) {
      this.receivedSubscription.remove();
      this.receivedSubscription = null;
    }
    if (this.responseSubscription) {
      this.responseSubscription.remove();
      this.responseSubscription = null;
    }
  }
}

export const pushNotificationService = new PushNotificationService();
