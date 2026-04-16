/**
 * CSRF Controller
 * Provides endpoint to retrieve CSRF token
 */
import { Controller, Get, Res, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';

import { CsrfService } from './csrf.service';
import { ExcludeCsrf } from './decorators/exclude-csrf.decorator';

@ApiTags('csrf')
@Controller("csrf")
export class CsrfController {
  constructor(private readonly csrfService: CsrfService) {}

  /**
   * Get CSRF token
   * This endpoint is excluded from CSRF protection
   * Frontend should call this to get the initial token
   */
  @Get('token')
  @ExcludeCsrf()
  @ApiOperation({ summary: '获取 CSRF Token', description: '获取 CSRF 令牌，前端应在首次请求时调用此接口获取令牌' })
  @ApiResponse({ status: 200, description: '成功返回 CSRF Token 信息' })
  getToken(@Res() res: Response): void {
    // The token will be automatically set in the response by CsrfGuard
    res.json({
      message: 'CSRF token is available in X-CSRF-Token header',
      headerName: this.csrfService.getHeaderName(),
      cookieName: this.csrfService.getCookieName(),
    });
  }
}
