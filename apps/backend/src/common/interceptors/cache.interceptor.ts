import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable, of, tap } from "rxjs";
import { Request } from "express";

import { CacheService } from "../../modules/cache/cache.service";
import {
  CACHE_KEY_METADATA,
  CACHE_TTL_METADATA,
  CACHE_CLEAR_METADATA,
} from "../decorators/cache.decorators";

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(
    private readonly cacheService: CacheService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method.toUpperCase();

    // Handle cache invalidation on mutations
    const clearPatterns = this.reflector.get<string[]>(
      CACHE_CLEAR_METADATA,
      context.getHandler(),
    );

    if (clearPatterns && clearPatterns.length > 0 && method !== "GET") {
      return next.handle().pipe(
        tap(async () => {
          for (const pattern of clearPatterns) {
            try {
              await this.cacheService.delPattern(pattern);
            } catch (error) {
              const msg = error instanceof Error ? error.message : String(error);
              this.logger.warn(`Failed to clear pattern ${pattern}: ${msg}`);
            }
          }
        }),
      );
    }

    // Handle cache read/write on GET requests
    if (method !== "GET") {
      return next.handle();
    }

    const cacheKey = this.reflector.get<string>(
      CACHE_KEY_METADATA,
      context.getHandler(),
    );
    const cacheTtl = this.reflector.get<number>(
      CACHE_TTL_METADATA,
      context.getHandler(),
    );

    if (!cacheKey) {
      return next.handle();
    }

    // Build full cache key including query params
    const fullKey = this.buildKey(cacheKey, request);
    const ttl = cacheTtl ?? 300; // Default 5 minutes

    return new Observable((subscriber) => {
      (async () => {
        try {
          const cached = await this.cacheService.get(fullKey);
          if (cached !== null) {
            // Cache HIT
            if (request.res) {
              request.res.setHeader("X-Cache", "HIT");
            }
            subscriber.next(cached);
            subscriber.complete();
            return;
          }

          // Cache MISS - execute handler
          if (request.res) {
            request.res.setHeader("X-Cache", "MISS");
          }

          next.handle().subscribe({
            next: async (data) => {
              // Cache the result in background
              try {
                await this.cacheService.set(fullKey, data, ttl);
              } catch (error) {
                const msg = error instanceof Error ? error.message : String(error);
                this.logger.warn(`Failed to cache key ${fullKey}: ${msg}`);
              }
              subscriber.next(data);
              subscriber.complete();
            },
            error: (err) => {
              subscriber.error(err);
            },
          });
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          this.logger.warn(`Cache interceptor error: ${msg}`);
          // Fallback to handler on cache errors
          next.handle().subscribe({
            next: (data) => {
              subscriber.next(data);
              subscriber.complete();
            },
            error: (err) => subscriber.error(err),
          });
        }
      })();
    });
  }

  private buildKey(baseKey: string, request: Request): string {
    const params = request.params;
    const query = request.query;

    const parts = [baseKey];

    if (params && Object.keys(params).length > 0) {
      parts.push(JSON.stringify(params));
    }

    if (query && Object.keys(query).length > 0) {
      const sortedQuery = Object.keys(query)
        .sort()
        .reduce(
          (acc, key) => {
            acc[key] = query[key];
            return acc;
          },
          {} as Record<string, unknown>,
        );
      parts.push(JSON.stringify(sortedQuery));
    }

    return parts.join(":");
  }
}
