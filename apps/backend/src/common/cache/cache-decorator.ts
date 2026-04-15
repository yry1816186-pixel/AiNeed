import { Inject, Injectable, NestInterceptor, ExecutionContext, CallHandler, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, from, of, switchMap } from 'rxjs';

import { TypedCacheService } from './typed-cache.service';

const CACHEABLE_TTL = 'cacheable:ttl';
const CACHEABLE_KEY_GENERATOR = 'cacheable:keyGenerator';
const CACHE_EVICT_PATTERN = 'cacheEvict:pattern';

export const Cacheable = (ttl?: number, keyGenerator?: (...args: unknown[]) => string) => {
  const decorators: (ClassDecorator | MethodDecorator)[] = [];
  if (ttl !== undefined) {
    decorators.push(SetMetadata(CACHEABLE_TTL, ttl));
  }
  if (keyGenerator) {
    decorators.push(SetMetadata(CACHEABLE_KEY_GENERATOR, keyGenerator));
  }
  return (target: object, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    decorators.forEach((decorator) => {
      if (descriptor && propertyKey) {
        (decorator as MethodDecorator)(target, propertyKey, descriptor);
      } else {
        (decorator as ClassDecorator)(target as new (...args: unknown[]) => unknown);
      }
    });
  };
};

export const CacheEvict = (pattern: string) => SetMetadata(CACHE_EVICT_PATTERN, pattern);

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    @Inject(TypedCacheService) private readonly cacheService: TypedCacheService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ttl = this.reflector.get<number>(CACHEABLE_TTL, context.getHandler());
    const keyGenerator = this.reflector.get<(...args: unknown[]) => string>(
      CACHEABLE_KEY_GENERATOR,
      context.getHandler(),
    );

    const className = context.getClass().name;
    const methodName = context.getHandler().name;
    const args = context.getArgs();

    const cacheKey = keyGenerator
      ? keyGenerator(...args)
      : `${className}:${methodName}:${JSON.stringify(args)}`;

    return from(this.cacheService.get<unknown>(cacheKey)).pipe(
      switchMap((cached) => {
        if (cached !== null) {
          return of(cached);
        }

        return next.handle().pipe(
          switchMap((result) =>
            from(this.cacheService.set(cacheKey, result, ttl)).pipe(
              switchMap(() => of(result)),
            ),
          ),
        );
      }),
    );
  }
}

@Injectable()
export class CacheEvictInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    @Inject(TypedCacheService) private readonly cacheService: TypedCacheService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const pattern = this.reflector.get<string>(CACHE_EVICT_PATTERN, context.getHandler());

    return next.handle().pipe(
      switchMap((result) => {
        if (pattern) {
          return from(this.cacheService.invalidate(pattern)).pipe(
            switchMap(() => of(result)),
          );
        }
        return of(result);
      }),
    );
  }
}
