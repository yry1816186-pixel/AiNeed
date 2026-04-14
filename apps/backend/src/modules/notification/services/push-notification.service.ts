import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../common/prisma/prisma.service";

/**
 * Push notification payload structure
 */
export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  category?: string;
}

/**
 * Result of a single push send attempt
 */
export interface PushSendResult {
  token: string;
  success: boolean;
  error?: string;
}

/**
 * Abstract push provider interface.
 * Implementations: FcmPushProvider (Android), ApnsPushProvider (iOS).
 */
export interface PushProvider {
  readonly name: string;
  send(token: string, payload: PushPayload): Promise<PushSendResult>;
  sendBatch(tokens: string[], payload: PushPayload): Promise<PushSendResult[]>;
  isAvailable(): boolean;
}

/**
 * FCM push provider using firebase-admin SDK.
 * Initialized only when FIREBASE_SERVICE_ACCOUNT env is set.
 */
class FcmPushProvider implements PushProvider {
  readonly name = "FCM";
  private readonly logger = new Logger(FcmPushProvider.name);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private firebaseApp: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private messaging: any = null;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    try {
      const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
      const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

      if (!serviceAccountPath && !serviceAccountJson) {
        this.logger.warn("Firebase credentials not configured. FCM push disabled.");
        return;
      }

      // Dynamic import to avoid hard dependency
      const admin = require("firebase-admin");

      let credential: unknown;
      if (serviceAccountJson) {
        credential = admin.credential.cert(JSON.parse(serviceAccountJson));
      } else if (serviceAccountPath) {
        credential = admin.credential.cert(serviceAccountPath);
      }

      this.firebaseApp = admin.initializeApp(
        { credential },
        "xuno-push-fcm",
      );
      this.messaging = admin.messaging(this.firebaseApp);
      this.logger.log("FCM push provider initialized successfully");
    } catch (error) {
      this.logger.warn(
        `FCM initialization failed: ${error instanceof Error ? error.message : "Unknown error"}. FCM push disabled.`,
      );
    }
  }

  isAvailable(): boolean {
    return this.messaging !== null;
  }

  async send(token: string, payload: PushPayload): Promise<PushSendResult> {
    if (!this.messaging) {
      return { token, success: false, error: "FCM not initialized" };
    }

    try {
      const message: Record<string, unknown> = {
        token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: this.stringifyData(payload.data),
        android: {
          priority: "high" as const,
          notification: {
            channelId: payload.category || "default",
            clickAction: payload.category?.toUpperCase() || "DEFAULT",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
              category: payload.category || "DEFAULT",
            },
          },
        },
      };

      await this.messaging.send(message);
      return { token, success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.warn(`FCM send failed for token ${token.substring(0, 10)}...: ${message}`);
      return { token, success: false, error: message };
    }
  }

  async sendBatch(tokens: string[], payload: PushPayload): Promise<PushSendResult[]> {
    if (!this.messaging) {
      return tokens.map((token) => ({
        token,
        success: false,
        error: "FCM not initialized",
      }));
    }

    try {
      const message = {
        tokens,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: this.stringifyData(payload.data),
        android: {
          priority: "high" as const,
          notification: {
            channelId: payload.category || "default",
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
              category: payload.category || "DEFAULT",
            },
          },
        },
      };

      const response = await this.messaging.sendMulticast(message);
      return tokens.map((token, index) => ({
        token,
        success: response.responses[index]?.success ?? false,
        error: response.responses[index]?.error?.message,
      }));
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      this.logger.warn(`FCM batch send failed: ${msg}`);
      return tokens.map((token) => ({ token, success: false, error: msg }));
    }
  }

  private stringifyData(
    data?: Record<string, unknown>,
  ): Record<string, string> | undefined {
    if (!data) return undefined;
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = typeof value === "string" ? value : JSON.stringify(value);
    }
    return result;
  }
}

/**
 * APNs push provider using node-apn package.
 * Initialized only when APNS_KEY_ID and APNS_TEAM_ID env are set.
 */
class ApnsPushProvider implements PushProvider {
  readonly name = "APNs";
  private readonly logger = new Logger(ApnsPushProvider.name);
  private apnProvider: unknown = null;
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    try {
      const keyId = process.env.APNS_KEY_ID;
      const teamId = process.env.APNS_TEAM_ID;
      const keyPath = process.env.APNS_KEY_PATH;

      if (!keyId || !teamId || !keyPath) {
        this.logger.warn("APNs credentials not configured. APNs push disabled.");
        return;
      }

      // Dynamic import for optional dependency
      const apn = require("apn");

      this.apnProvider = new apn.Provider({
        token: {
          key: keyPath,
          keyId,
          teamId,
        },
        production: process.env.NODE_ENV === "production",
      });

      this.initialized = true;
      this.logger.log("APNs push provider initialized successfully");
    } catch (error) {
      this.logger.warn(
        `APNs initialization failed: ${error instanceof Error ? error.message : "Unknown error"}. APNs push disabled.`,
      );
    }
  }

  isAvailable(): boolean {
    return this.initialized;
  }

  async send(token: string, payload: PushPayload): Promise<PushSendResult> {
    if (!this.apnProvider) {
      return { token, success: false, error: "APNs not initialized" };
    }

    try {
      const apn = require("apn");
      const notification = new apn.Notification({
        alert: {
          title: payload.title,
          body: payload.body,
        },
        payload: payload.data || {},
        sound: "default",
        badge: 1,
        topic: process.env.APNS_BUNDLE_ID || "com.xuno.app",
      });

      const result = await (this.apnProvider as { send: (n: unknown, t: string) => Promise<{ sent: unknown[]; failed: unknown[] }> }).send(notification, token);

      if (result.failed && result.failed.length > 0) {
        return { token, success: false, error: "APNs delivery failed" };
      }

      return { token, success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.warn(`APNs send failed: ${message}`);
      return { token, success: false, error: message };
    }
  }

  async sendBatch(tokens: string[], payload: PushPayload): Promise<PushSendResult[]> {
    const results: PushSendResult[] = [];
    // APNs sends individually; parallelize with concurrency limit
    const concurrency = 5;
    for (let i = 0; i < tokens.length; i += concurrency) {
      const batch = tokens.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map((token) => this.send(token, payload)),
      );
      results.push(...batchResults);
    }
    return results;
  }
}

/**
 * Unified push notification service.
 * Routes to FCM or APNs based on device token and platform.
 * Gracefully handles missing provider configuration.
 */
@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private readonly providers: PushProvider[] = [];
  private readonly maxRetries = 3;

  constructor(private readonly prisma: PrismaService) {
    // Initialize available providers
    this.providers = [new FcmPushProvider(), new ApnsPushProvider()];

    const available = this.providers.filter((p) => p.isAvailable());
    if (available.length === 0) {
      this.logger.warn(
        "No push notification providers available. Push notifications disabled. Configure FIREBASE_SERVICE_ACCOUNT_JSON or APNS credentials to enable.",
      );
    } else {
      this.logger.log(
        `Push providers available: ${available.map((p) => p.name).join(", ")}`,
      );
    }
  }

  /**
   * Register a device token for a user
   */
  async registerDeviceToken(
    userId: string,
    token: string,
    platform: string,
    appId?: string,
  ) {
    return this.prisma.pushDeviceToken.upsert({
      where: {
        userId_token: { userId, token },
      },
      update: {
        platform,
        appId,
        isActive: true,
      },
      create: {
        userId,
        token,
        platform,
        appId,
      },
    });
  }

  /**
   * Deregister a device token
   */
  async deregisterDeviceToken(userId: string, token: string) {
    return this.prisma.pushDeviceToken.updateMany({
      where: { userId, token },
      data: { isActive: false },
    });
  }

  /**
   * Get all active device tokens for a user
   */
  async getUserDeviceTokens(userId: string): Promise<string[]> {
    const devices = await this.prisma.pushDeviceToken.findMany({
      where: { userId, isActive: true },
      select: { token: true, platform: true },
    });
    return devices.map((d) => d.token);
  }

  /**
   * Get device tokens with platform info for a user
   */
  async getUserDevices(userId: string) {
    return this.prisma.pushDeviceToken.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Send push notification to a specific user
   */
  async sendToUser(
    userId: string,
    payload: PushPayload,
  ): Promise<PushSendResult[]> {
    const tokens = await this.getUserDeviceTokens(userId);
    if (tokens.length === 0) {
      this.logger.debug(`No device tokens for user ${userId}, skipping push`);
      return [];
    }

    return this.sendWithRetry(tokens, payload);
  }

  /**
   * Send push notification to multiple users
   */
  async sendToUsers(
    userIds: string[],
    payload: PushPayload,
  ): Promise<Map<string, PushSendResult[]>> {
    const results = new Map<string, PushSendResult[]>();

    // Batch fetch all tokens
    const devices = await this.prisma.pushDeviceToken.findMany({
      where: {
        userId: { in: userIds },
        isActive: true,
      },
      select: { userId: true, token: true },
    });

    // Group by user
    const tokensByUser = new Map<string, string[]>();
    for (const device of devices) {
      const existing = tokensByUser.get(device.userId) || [];
      existing.push(device.token);
      tokensByUser.set(device.userId, existing);
    }

    // Send to each user's tokens
    for (const userId of userIds) {
      const tokens = tokensByUser.get(userId) || [];
      if (tokens.length === 0) {
        results.set(userId, []);
        continue;
      }
      const sendResults = await this.sendWithRetry(tokens, payload);
      results.set(userId, sendResults);
    }

    return results;
  }

  /**
   * Send with retry logic (exponential backoff)
   */
  private async sendWithRetry(
    tokens: string[],
    payload: PushPayload,
  ): Promise<PushSendResult[]> {
    const availableProviders = this.providers.filter((p) => p.isAvailable());
    if (availableProviders.length === 0) {
      return tokens.map((token) => ({
        token,
        success: false,
        error: "No push providers available",
      }));
    }

    // Use the first available provider (FCM handles both platforms)
    const provider = availableProviders[0]!;

    let lastResults: PushSendResult[] = [];
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      const results = tokens.length > 1
        ? await provider.sendBatch(tokens, payload)
        : [await provider.send(tokens[0]!, payload)];

      const failed = results.filter((r) => !r.success);
      if (failed.length === 0) {
        return results;
      }

      lastResults = results;

      if (attempt < this.maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 100; // 100ms, 200ms, 400ms
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    // Deactivate invalid tokens
    const permanentlyFailed = lastResults.filter(
      (r) => !r.success && (r.error?.includes("NotRegistered") || r.error?.includes("InvalidRegistration")),
    );
    if (permanentlyFailed.length > 0) {
      await this.deactivateTokens(permanentlyFailed.map((r) => r.token));
    }

    return lastResults;
  }

  /**
   * Deactivate invalid device tokens
   */
  private async deactivateTokens(tokens: string[]) {
    try {
      await this.prisma.pushDeviceToken.updateMany({
        where: { token: { in: tokens } },
        data: { isActive: false },
      });
      this.logger.log(`Deactivated ${tokens.length} invalid device tokens`);
    } catch (error) {
      this.logger.error(
        `Failed to deactivate tokens: ${error instanceof Error ? error.message : "Unknown"}`,
      );
    }
  }
}
