import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SKIP_RESPONSE_TRANSFORM } from './transform.interceptor';

export const JSON_API_TYPE = 'json_api_type';
export const SKIP_JSON_API = 'skip_json_api';

export interface JsonApiResource {
  type: string;
  id: string;
  attributes: Record<string, unknown>;
  relationships?: Record<string, JsonApiRelationships>;
  links?: { self: string };
}

export interface JsonApiRelationships {
  data: { type: string; id: string } | Array<{ type: string; id: string }>;
  links?: { self: string; related: string };
}

export interface JsonApiResponse {
  data: JsonApiResource | JsonApiResource[] | null;
  included?: JsonApiResource[];
  meta: {
    requestId?: string;
    timestamp: string;
    total?: number;
    nextCursor?: string;
    hasMore?: boolean;
  };
  links?: {
    self: string;
    next?: string;
  };
}

export interface JsonApiError {
  status: string;
  code: string;
  title: string;
  detail: string;
  source?: {
    pointer?: string;
    parameter?: string;
  };
  meta?: Record<string, unknown>;
}

export interface JsonApiDocument {
  data: JsonApiResource | JsonApiResource[] | null;
  included?: JsonApiResource[];
  meta: Record<string, unknown>;
  links?: Record<string, string>;
  errors?: JsonApiError[];
}

export const JsonApiType = (type: string) => SetMetadata(JSON_API_TYPE, type);
export const SkipJsonApi = () => SetMetadata(SKIP_JSON_API, true);

@Injectable()
export class JsonApiInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const skipJsonApi = this.reflector.getAllAndOverride<boolean>(SKIP_JSON_API, [
      context.getHandler(),
      context.getClass(),
    ]);

    const skipTransform = this.reflector.getAllAndOverride<boolean>(SKIP_RESPONSE_TRANSFORM, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipJsonApi || skipTransform) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<{
      url: string;
      headers: Record<string, string>;
    }>();

    const resourceType = this.getResourceType(context);
    const requestId = request.headers['x-request-id'] as string | undefined;
    const selfLink = request.url;

    return next.handle().pipe(
      map((data: unknown) => {
        const timestamp = new Date().toISOString();

        if (data === null || data === undefined) {
          return {
            data: null,
            meta: {
              requestId,
              timestamp,
            },
            links: { self: selfLink },
          } as JsonApiResponse;
        }

        if (this.isPaginatedResponse(data)) {
          return this.transformPaginated(data, resourceType, requestId, timestamp, selfLink);
        }

        if (Array.isArray(data)) {
          return this.transformArray(data, resourceType, requestId, timestamp, selfLink);
        }

        if (typeof data === 'object') {
          return this.transformSingle(data as Record<string, unknown>, resourceType, requestId, timestamp, selfLink);
        }

        return {
          data: null,
          meta: { requestId, timestamp },
          links: { self: selfLink },
        } as JsonApiResponse;
      }),
    );
  }

  private getResourceType(context: ExecutionContext): string {
    const customType = this.reflector.getAllAndOverride<string>(JSON_API_TYPE, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (customType) {
      return customType;
    }

    const className = context.getClass().name;
    const withoutSuffix = className
      .replace(/Controller$/, '')
      .replace(/Service$/, '');

    return withoutSuffix
      .replace(/([A-Z])/g, (match, offset: number) =>
        offset > 0 ? '-' + match.toLowerCase() : match.toLowerCase(),
      )
      .replace(/-+$/, '')
      .toLowerCase();
  }

  private isPaginatedResponse(data: unknown): data is {
    items: unknown[];
    meta: { nextCursor?: string; hasMore?: boolean; total?: number };
  } {
    if (!data || typeof data !== 'object') {
      return false;
    }

    const obj = data as Record<string, unknown>;
    return (
      Array.isArray(obj.items) &&
      typeof obj.meta === 'object' &&
      obj.meta !== null
    );
  }

  private transformPaginated(
    data: { items: unknown[]; meta: { nextCursor?: string; hasMore?: boolean; total?: number } },
    resourceType: string,
    requestId: string | undefined,
    timestamp: string,
    selfLink: string,
  ): JsonApiResponse {
    const included: JsonApiResource[] = [];
    const resources: JsonApiResource[] = [];

    for (const item of data.items) {
      if (item && typeof item === 'object') {
        const { resource, included: itemIncluded } = this.serializeResource(
          item as Record<string, unknown>,
          resourceType,
        );
        resources.push(resource);
        included.push(...itemIncluded);
      }
    }

    const response: JsonApiResponse = {
      data: resources,
      included: included.length > 0 ? this.deduplicateIncluded(included) : undefined,
      meta: {
        requestId,
        timestamp,
        total: data.meta.total ?? data.items.length,
        nextCursor: data.meta.nextCursor,
        hasMore: data.meta.hasMore,
      },
      links: {
        self: selfLink,
        ...(data.meta.nextCursor ? { next: `${selfLink}${selfLink.includes('?') ? '&' : '?'}cursor=${data.meta.nextCursor}` } : {}),
      },
    };

    return response;
  }

  private transformArray(
    data: unknown[],
    resourceType: string,
    requestId: string | undefined,
    timestamp: string,
    selfLink: string,
  ): JsonApiResponse {
    const included: JsonApiResource[] = [];
    const resources: JsonApiResource[] = [];

    for (const item of data) {
      if (item && typeof item === 'object') {
        const { resource, included: itemIncluded } = this.serializeResource(
          item as Record<string, unknown>,
          resourceType,
        );
        resources.push(resource);
        included.push(...itemIncluded);
      }
    }

    return {
      data: resources,
      included: included.length > 0 ? this.deduplicateIncluded(included) : undefined,
      meta: {
        requestId,
        timestamp,
        total: resources.length,
      },
      links: { self: selfLink },
    };
  }

  private transformSingle(
    data: Record<string, unknown>,
    resourceType: string,
    requestId: string | undefined,
    timestamp: string,
    selfLink: string,
  ): JsonApiResponse {
    const { resource, included } = this.serializeResource(data, resourceType);

    return {
      data: resource,
      included: included.length > 0 ? this.deduplicateIncluded(included) : undefined,
      meta: {
        requestId,
        timestamp,
      },
      links: { self: selfLink },
    };
  }

  private serializeResource(
    data: Record<string, unknown>,
    defaultType: string,
  ): { resource: JsonApiResource; included: JsonApiResource[] } {
    const included: JsonApiResource[] = [];
    const id = this.extractId(data);
    const type = (data.type as string) || defaultType;

    const attributes: Record<string, unknown> = {};
    const relationships: Record<string, JsonApiRelationships> = {};

    const idKeys = new Set(['id', '_id', 'uuid']);
    const skipKeys = new Set(['id', '_id', 'uuid', 'type']);

    for (const [key, value] of Object.entries(data)) {
      if (skipKeys.has(key)) {
        continue;
      }

      if (this.isRelationshipObject(value)) {
        const relType = (value as Record<string, unknown>).type as string || this.inferTypeFromKey(key);
        const relId = String(this.extractId(value as Record<string, unknown>));

        relationships[key] = {
          data: { type: relType, id: relId },
        };

        const { resource: includedResource, included: nestedIncluded } = this.serializeResource(
          value as Record<string, unknown>,
          relType,
        );
        included.push(includedResource, ...nestedIncluded);
        continue;
      }

      if (Array.isArray(value) && value.length > 0 && this.isRelationshipObject(value[0])) {
        const relType = (value[0] as Record<string, unknown>).type as string || this.inferTypeFromKey(key);
        const relData: Array<{ type: string; id: string }> = [];

        for (const item of value) {
          if (this.isRelationshipObject(item)) {
            const relId = String(this.extractId(item as Record<string, unknown>));
            relData.push({ type: relType, id: relId });

            const { resource: includedResource, included: nestedIncluded } = this.serializeResource(
              item as Record<string, unknown>,
              relType,
            );
            included.push(includedResource, ...nestedIncluded);
          }
        }

        relationships[key] = {
          data: relData,
        };
        continue;
      }

      attributes[key] = value;
    }

    const resource: JsonApiResource = {
      type,
      id,
      attributes,
      ...(Object.keys(relationships).length > 0 ? { relationships } : {}),
    };

    return { resource, included };
  }

  private extractId(data: Record<string, unknown>): string {
    if (data.id !== undefined && data.id !== null) {
      return String(data.id);
    }
    if (data._id !== undefined && data._id !== null) {
      return String(data._id);
    }
    if (data.uuid !== undefined && data.uuid !== null) {
      return String(data.uuid);
    }
    return '';
  }

  private isRelationshipObject(value: unknown): boolean {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }

    const obj = value as Record<string, unknown>;
    return (
      (obj.id !== undefined && obj.id !== null) ||
      (obj._id !== undefined && obj._id !== null) ||
      (obj.uuid !== undefined && obj.uuid !== null)
    );
  }

  private inferTypeFromKey(key: string): string {
    const singularMap: Record<string, string> = {
      items: 'item',
      users: 'user',
      products: 'product',
      clothing: 'clothing',
      categories: 'category',
      orders: 'order',
      messages: 'message',
      photos: 'photo',
      recommendations: 'recommendation',
      favorites: 'favorite',
      outfits: 'outfit',
      tags: 'tag',
      brands: 'brand',
      notifications: 'notification',
      sessions: 'session',
      addresses: 'address',
      cartItems: 'cart-item',
      wardrobeItems: 'wardrobe-item',
    };

    if (singularMap[key]) {
      return singularMap[key];
    }

    if (key.endsWith('s') && key.length > 1) {
      return key.slice(0, -1).replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
    }

    return key.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
  }

  private deduplicateIncluded(included: JsonApiResource[]): JsonApiResource[] {
    const seen = new Map<string, JsonApiResource>();

    for (const resource of included) {
      const key = `${resource.type}:${resource.id}`;
      if (!seen.has(key)) {
        seen.set(key, resource);
      }
    }

    return Array.from(seen.values());
  }
}
