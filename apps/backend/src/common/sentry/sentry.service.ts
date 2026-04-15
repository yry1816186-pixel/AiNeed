import { Injectable, OnModuleDestroy, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

@Injectable()
export class SentryService implements OnModuleDestroy {
  private readonly logger = new Logger(SentryService.name);
  private readonly dsn: string;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.dsn = this.configService.get<string>("SENTRY_DSN", "");
    this.enabled = !!this.dsn;

    if (this.enabled) {
      const environment =
        this.configService.get<string>("NODE_ENV") === "production"
          ? "production"
          : "development";
      const release = `xuno-backend@${this.configService.get<string>("npm_package_version", "1.0.0")}`;

      Sentry.init({
        dsn: this.dsn,
        environment,
        release,
        integrations: [nodeProfilingIntegration()],
        tracesSampleRate: environment === "production" ? 0.2 : 0.5,
        profilesSampleRate: environment === "production" ? 0.1 : 0.2,
        attachStacktrace: true,
        sendDefaultPii: false,
        serverName: this.configService.get<string>("SERVICE_NAME", "xuno-backend"),
      });

      this.logger.log(
        `Sentry initialized: env=${environment}, release=${release}`,
      );
    } else {
      this.logger.debug("Sentry disabled: SENTRY_DSN not configured");
    }
  }

  captureException(exception: unknown, context?: Record<string, unknown>): string | undefined {
    if (!this.enabled) {return undefined;}

    const eventId = Sentry.captureException(exception, {
      extra: context,
    });

    return eventId;
  }

  captureMessage(
    message: string,
    level: Sentry.SeverityLevel = "info",
    context?: Record<string, unknown>,
  ): string | undefined {
    if (!this.enabled) {return undefined;}

    const eventId = Sentry.captureMessage(message, {
      level,
      extra: context,
    });

    return eventId;
  }

  setUser(user: { id: string; email?: string; username?: string }): void {
    if (!this.enabled) {return;}
    Sentry.setUser(user);
  }

  setTag(key: string, value: string): void {
    if (!this.enabled) {return;}
    Sentry.setTag(key, value);
  }

  setContext(name: string, context: Record<string, unknown>): void {
    if (!this.enabled) {return;}
    Sentry.setContext(name, context);
  }

  addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
    if (!this.enabled) {return;}
    Sentry.addBreadcrumb(breadcrumb);
  }

  startSpan(options: { name: string; op: string; tags?: Record<string, string> }): Sentry.Span | undefined {
    if (!this.enabled) {return undefined;}
    return Sentry.startInactiveSpan(options);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.enabled) {
      await Sentry.close(2000);
    }
  }
}
