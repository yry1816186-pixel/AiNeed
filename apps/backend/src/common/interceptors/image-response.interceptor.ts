import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ImageSizeName, DEFAULT_SIZES } from '../utils/image-sizes';

const ACCEPT_SIZE_MAP: Record<string, ImageSizeName> = {
  'image/thumbnail': 'thumbnail',
  'image/small': 'small',
  'image/medium': 'medium',
  'image/large': 'large',
  'image/original': 'original',
};

@Injectable()
export class ImageResponseInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const requestedSize = this.resolveRequestedSize(request);

    return next.handle().pipe(
      map((data) => {
        if (!data?.urls) {
          return data;
        }

        const { urls, ...rest } = data;

        if (requestedSize && urls[requestedSize]) {
          return {
            ...rest,
            url: urls[requestedSize],
            requestedSize,
            availableSizes: Object.keys(urls) as ImageSizeName[],
          };
        }

        return {
          ...rest,
          urls,
          recommendedSize: this.getRecommendedSize(request),
          availableSizes: Object.keys(urls) as ImageSizeName[],
        };
      }),
    );
  }

  private resolveRequestedSize(request: Request): ImageSizeName | null {
    const sizeParam = request.query['size'] as string;
    if (sizeParam && DEFAULT_SIZES.includes(sizeParam as ImageSizeName)) {
      return sizeParam as ImageSizeName;
    }

    const accept = request.headers['accept'] as string;
    if (accept) {
      for (const [mimeType, size] of Object.entries(ACCEPT_SIZE_MAP)) {
        if (accept.includes(mimeType)) {
          return size;
        }
      }
    }

    return null;
  }

  private getRecommendedSize(request: Request): ImageSizeName {
    const viewportWidth = request.headers['x-viewport-width'];
    if (viewportWidth) {
      const width = parseInt(viewportWidth as string, 10);
      if (width <= 200) {return 'thumbnail';}
      if (width <= 400) {return 'small';}
      if (width <= 800) {return 'medium';}
      if (width <= 1200) {return 'large';}
      return 'original';
    }
    return 'medium';
  }
}
