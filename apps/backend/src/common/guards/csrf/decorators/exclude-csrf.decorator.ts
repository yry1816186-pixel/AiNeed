/**
 * Exclude CSRF Decorator
 * Marks routes or controllers to be excluded from CSRF protection
 */
import { SetMetadata } from '@nestjs/common';

export const EXCLUDE_CSRF_KEY = 'excludeCsrf';

/**
 * Decorator to exclude a route or controller from CSRF protection
 * Use this for public endpoints or webhooks
 */
export const ExcludeCsrf = () => SetMetadata(EXCLUDE_CSRF_KEY, true);
