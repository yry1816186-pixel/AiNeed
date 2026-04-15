import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Optional,
} from "@nestjs/common";
import * as Sentry from "@sentry/node";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";

import { SentryService } from "../sentry/sentry.service";

@Injectable()
export class SentryInterceptor implements NestInterceptor {
  constructor(@Optional() private readonly sentryService?: SentryService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (!this.sentryService?.isEnabled()) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const controllerClass = context.getClass();
    const handler = context.getHandler();

    const span = this.sentryService.startSpan({
      name: `${controllerClass.name}.${handler.name}`,
      op: "http.server",
      tags: {
        "http.method": method,
        "http.url": url,
      },
    });

    return next.handle().pipe(
      tap({
        next: () => {
          if (span) {
            span.end();
          }
        },
        error: (error) => {
          if (span) {
            span.setStatus({ code: 2, message: "internal_error" });
            span.end();
          }
        },
      }),
    );
  }
}
