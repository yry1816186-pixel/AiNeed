/**
 * CSRF Service
 * Handles CSRF token generation and validation
 */
import { createHash, randomBytes, timingSafeEqual } from 'crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  CSRF_COOKIE_NAME,
  CSRF_ERROR_MESSAGES,
  CSRF_HEADER_NAME,
  CSRF_SECRET_ENV,
} from './csrf.constants';

@Injectable()
export class CsrfService {
  private readonly secret: string;

  constructor(private readonly configService: ConfigService) {
    this.secret = this.configService.get<string>(CSRF_SECRET_ENV) || this.generateSecret();
  }

  /**
   * Generate a new CSRF token
   */
  generateToken(sessionId: string): string {
    const timestamp = Date.now().toString();
    const tokenData = `${sessionId}:${timestamp}`;

    const token = createHash('sha256')
      .update(tokenData + this.secret)
      .digest('hex');

    return `${timestamp}:${token}`;
  }

  /**
   * Validate a CSRF token
   */
  validateToken(sessionId: string, token: string): boolean {
    if (!token || !sessionId) {
      return false;
    }

    const [timestamp, hash] = token.split(':');

    if (!timestamp || !hash) {
      return false;
    }

    // Check token age (24 hours max)
    const tokenAge = Date.now() - parseInt(timestamp, 10);
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    if (tokenAge > maxAge) {
      return false;
    }

    // Regenerate hash and compare (timing-safe to prevent timing attacks)
    const tokenData = `${sessionId}:${timestamp}`;
    const expectedHash = createHash('sha256')
      .update(tokenData + this.secret)
      .digest('hex');

    if (hash.length !== expectedHash.length) {
      return false;
    }

    return timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash));
  }

  /**
   * Generate a strong random secret
   */
  private generateSecret(): string {
    return randomBytes(64).toString('hex');
  }

  /**
   * Get CSRF cookie name
   */
  getCookieName(): string {
    return CSRF_COOKIE_NAME;
  }

  /**
   * Get CSRF header name
   */
  getHeaderName(): string {
    return CSRF_HEADER_NAME;
  }

  /**
   * Get error messages
   */
  getErrorMessage(key: keyof typeof CSRF_ERROR_MESSAGES): string {
    return CSRF_ERROR_MESSAGES[key];
  }
}
