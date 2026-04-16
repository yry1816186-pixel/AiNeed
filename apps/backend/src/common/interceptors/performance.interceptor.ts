import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { Observable, tap } from "rxjs";

import { MetricsService } from "../../domains/platform/metrics/metrics.service";

const SLOW_REQUEST_THRESHOLD_MS = 500;

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceInterceptor.name);

  constructor(private readonly metricsService: MetricsService) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const { method } = request;
    const url = request.url || "/";
    const route = url.split("?")[0] ?? "/";

    const startHr = process.hrtime();

    return next.handle().pipe(
      tap({
        next: () => {
          const diff = process.hrtime(startHr);
          const durationMs = diff[0] * 1000 + diff[1] / 1_000_000;
          const durationSec = durationMs / 1000;

          const statusCode = response.statusCode?.toString() ?? "200";

          // Record Prometheus metrics
          this.metricsService.recordHttpRequest(
            method,
            route,
            parseInt(statusCode, 10),
            durationSec,
          );

          // Set response time header
          if (response.setHeader) {
            response.setHeader("X-Response-Time", `${durationMs.toFixed(1)}ms`);
          }

          // Log slow requests
          if (durationMs > SLOW_REQUEST_THRESHOLD_MS) {
            this.logger.warn(
              `Slow request: ${method} ${url} ${statusCode} ${durationMs.toFixed(1)}ms`,
            );
          }
        },
      }),
    );
  }
}
