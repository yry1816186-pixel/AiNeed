import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse, ResponseMeta } from '../types/api.types';

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        if (data && typeof data === 'object' && 'success' in data) {
          return data as ApiResponse<T>;
        }

        if (
          data &&
          typeof data === 'object' &&
          'items' in data &&
          'meta' in data
        ) {
          const paginatedData = data as {
            items: T[];
            meta: ResponseMeta;
          };
          return {
            success: true,
            data: paginatedData.items,
            meta: paginatedData.meta,
          } as ApiResponse<T>;
        }

        return {
          success: true,
          data,
        } as ApiResponse<T>;
      }),
    );
  }
}
