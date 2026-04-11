/**
 * CSRF Controller
 * Provides endpoint to retrieve CSRF token
 */
import { Controller, Get, Res, Headers } from '@nestjs/common';
import { Response } from 'express';

import { CsrfService } from './csrf.service';
import { ExcludeCsrf } from './decorators/exclude-csrf.decorator';

@Controller('csrf')
export class CsrfController {
  constructor(private readonly csrfService: CsrfService) {}

  /**
   * Get CSRF token
   * This endpoint is excluded from CSRF protection
   * Frontend should call this to get the initial token
   */
  @Get('token')
  @ExcludeCsrf()
  getToken(@Res() res: Response): void {
    // The token will be automatically set in the response by CsrfGuard
    res.json({
      message: 'CSRF token is available in X-CSRF-Token header',
      headerName: this.csrfService.getHeaderName(),
      cookieName: this.csrfService.getCookieName(),
    });
  }
}
