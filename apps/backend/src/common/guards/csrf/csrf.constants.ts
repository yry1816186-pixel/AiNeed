/**
 * CSRF Constants
 * Configuration and constant values for CSRF protection
 */
export const CSRF_COOKIE_NAME = '_csrf';
export const CSRF_HEADER_NAME = 'x-csrf-token';
export const CSRF_SECRET_ENV = 'CSRF_SECRET';

export const CSRF_COOKIE_OPTIONS = {
  httpOnly: false,
  secure: false,
  sameSite: 'lax' as const,
  maxAge: 86400, // 24 hours
};

export const CSRF_ERROR_MESSAGES = {
  INVALID_TOKEN: 'Invalid CSRF token',
  MISSING_TOKEN: 'CSRF token is missing',
  TOKEN_EXPIRED: 'CSRF token has expired',
};
