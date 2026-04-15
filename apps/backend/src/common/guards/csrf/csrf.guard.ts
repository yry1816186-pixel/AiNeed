/**
 * CSRF Guard
 * Protects routes from CSRF attacks
 */
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Response } from 'express';

import { RequestWithUser } from '../../types/common.types';

import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME, CSRF_ERROR_MESSAGES } from './csrf.constants';
import { CsrfService } from './csrf.service';
import { EXCLUDE_CSRF_KEY } from './decorators/exclude-csrf.decorator';

@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly logger = new Logger(CsrfGuard.name);

  constructor(
    private readonly csrfService: CsrfService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if route is excluded from CSRF protection
    const isExcluded = this.reflector.getAllAndOverride<boolean>(EXCLUDE_CSRF_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isExcluded) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Skip CSRF validation for GET, HEAD, OPTIONS requests
    const method = request.method.toUpperCase();
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return this.handleSafeRequest(request, response);
    }

    // Validate CSRF token for state-changing requests
    return this.handleStateChangingRequest(request, context);
  }

  /**
   * Handle safe requests (GET, HEAD, OPTIONS)
   * Generate and expose CSRF token
   */
  private handleSafeRequest(request: RequestWithUser, response: Response): boolean {
    try {
      // Get session ID (you may need to adjust this based on your auth implementation)
      const sessionId = this.getSessionId(request);

      if (sessionId) {
        const csrfToken = this.csrfService.generateToken(sessionId);

        // Set CSRF cookie
        response.cookie(CSRF_COOKIE_NAME, csrfToken, {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 86400, // 24 hours
        });

        // Expose CSRF token in header
        response.setHeader(CSRF_HEADER_NAME, csrfToken);
        response.setHeader('Access-Control-Expose-Headers', CSRF_HEADER_NAME);

        // Attach token to request for easy access
        request.csrfToken = csrfToken;
      }

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error generating CSRF token: ${errorMessage}`);
      // In production, fail closed: reject request when token generation fails
      if (process.env.NODE_ENV === 'production') {
        return false;
      }
      return true; // Allow in non-production for development convenience
    }
  }

  /**
   * Handle state-changing requests (POST, PUT, DELETE, PATCH)
   * Validate CSRF token
   */
  private handleStateChangingRequest(request: RequestWithUser, context: ExecutionContext): boolean {
    try {
      const sessionId = this.getSessionId(request);

      if (!sessionId) {
        // In production, reject requests without session for state-changing operations
        if (process.env.NODE_ENV === 'production') {
          return false;
        }
        // Allow in non-production (public endpoints should use @ExcludeCsrf)
        return true;
      }

      // Get token from header
      const token = request.headers[CSRF_HEADER_NAME];

      if (!token) {
        this.logger.warn(`CSRF token missing for ${request.method} ${request.path}`);
        throw new BadRequestException(CSRF_ERROR_MESSAGES.MISSING_TOKEN);
      }

      // Validate token
      const isValid = this.csrfService.validateToken(sessionId, token as string);

      if (!isValid) {
        this.logger.warn(`Invalid CSRF token for ${request.method} ${request.path}`);
        throw new BadRequestException(CSRF_ERROR_MESSAGES.INVALID_TOKEN);
      }

      return true;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error validating CSRF token: ${errorMessage}`);
      throw new BadRequestException(CSRF_ERROR_MESSAGES.INVALID_TOKEN);
    }
  }

  /**
   * Get session ID from request
   * Adjust this based on your authentication implementation
   */
  private getSessionId(request: RequestWithUser): string | null {
    // Try to get from JWT user
    if (request.user?.id) {
      return request.user.id;
    }

    // Try to get from session
    if (request.session?.id) {
      return request.session.id;
    }

    // Try to get from authorization header (for API usage)
    const authHeader = request.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      return token.substring(0, 32); // Use first 32 chars as session identifier
    }

    return null;
  }
}
