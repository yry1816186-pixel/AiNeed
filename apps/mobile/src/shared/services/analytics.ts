import apiClient from "../../services/api/client";

interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
  timestamp?: number;
}

interface BackendAnalyticsEvent {
  sessionId: string;
  anonymousId: string;
  eventType:
    | "page_view"
    | "item_view"
    | "search"
    | "filter"
    | "click"
    | "scroll"
    | "try_on_start"
    | "try_on_complete"
    | "favorite"
    | "unfavorite"
    | "share"
    | "add_to_cart"
    | "remove_from_cart"
    | "purchase"
    | "recommendation_view"
    | "recommendation_click";
  category: string;
  action: string;
  targetType?: string;
  metadata?: Record<string, unknown>;
  source: string;
  duration?: number;
}

function createSessionId(): string {
  return `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeEventType(eventName: string): BackendAnalyticsEvent["eventType"] {
  switch (eventName) {
    case "screen_view":
      return "page_view";
    case "search":
      return "search";
    case "filter":
      return "filter";
    case "scroll":
      return "scroll";
    case "try_on_start":
      return "try_on_start";
    case "try_on_complete":
      return "try_on_complete";
    case "favorite":
      return "favorite";
    case "unfavorite":
      return "unfavorite";
    case "share":
      return "share";
    case "add_to_cart":
      return "add_to_cart";
    case "remove_from_cart":
      return "remove_from_cart";
    case "purchase":
      return "purchase";
    case "recommendation_view":
      return "recommendation_view";
    case "recommendation_click":
      return "recommendation_click";
    default:
      return "click";
  }
}

class AnalyticsService {
  private queue: AnalyticsEvent[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;
  private isEnabled = false;
  private sessionId = createSessionId();
  private anonymousId = createSessionId();

  init(): void {
    this.isEnabled = true;
    this.flushInterval = setInterval(() => this.flush(), 30000);
  }

  trackScreen(screenName: string, params?: Record<string, unknown>): void {
    this.track("screen_view", { screen: screenName, ...params });
  }

  track(eventName: string, properties?: Record<string, unknown>): void {
    if (!this.isEnabled) {
      return;
    }

    this.queue.push({
      name: eventName,
      properties,
      timestamp: Date.now(),
    });

    if (this.queue.length >= 20) {
      void this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (this.queue.length === 0) {
      return;
    }

    const events = [...this.queue];
    this.queue = [];
    const payload = events.map((event) => this.toBackendEvent(event));

    try {
      const response = await apiClient.post<{ success: boolean; count?: number }>(
        "/analytics/track/batch",
        payload
      );

      if (!response.success) {
        this.queue = [...events, ...this.queue].slice(0, 100);
      }
    } catch {
      this.queue = [...events, ...this.queue].slice(0, 100);
    }
  }

  private toBackendEvent(event: AnalyticsEvent): BackendAnalyticsEvent {
    const screen =
      typeof event.properties?.screen === "string" ? event.properties.screen : undefined;
    const duration =
      typeof event.properties?.duration === "number" ? event.properties.duration : undefined;

    return {
      sessionId: this.sessionId,
      anonymousId: this.anonymousId,
      eventType: normalizeEventType(event.name),
      category: screen ? "navigation" : "engagement",
      action: screen ?? event.name,
      targetType: screen ? "screen" : "event",
      metadata: {
        ...event.properties,
        eventName: event.name,
        clientTimestamp: event.timestamp ?? Date.now(),
      },
      source: "mobile-app",
      duration,
    };
  }

  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    void this.flush();
    this.isEnabled = false;
  }
}

export const analytics = new AnalyticsService();
