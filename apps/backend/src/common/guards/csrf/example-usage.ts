/**
 * Example Usage of CSRF Protection
 *
 * This file demonstrates how to use CSRF protection in your controllers.
 * Copy the patterns shown here to your own controllers.
 */

import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';

import { CsrfGuard } from './csrf.guard';
import { ExcludeCsrf } from './decorators/exclude-csrf.decorator';

/**
 * Example 1: Standard CRUD Controller with CSRF Protection
 * All routes are protected by default
 */
@Controller('api/v1/example')
@UseGuards(CsrfGuard)
export class ExampleController {
  /**
   * GET request - automatically generates and exposes CSRF token
   * Frontend can read the token from X-CSRF-Token header
   */
  @Get()
  findAll() {
    return { message: 'This GET request generates a CSRF token in the response headers' };
  }

  /**
   * POST request - requires CSRF token in X-CSRF-Token header
   * Frontend must include the token from previous GET request
   */
  @Post()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create(@Body() _createDto: any) {
    return { message: 'This POST request requires valid CSRF token' };
  }

  /**
   * PUT request - requires CSRF token
   */
  @Put(':id')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update(@Param('id') id: string, @Body() _updateDto: any) {
    return { message: `This PUT request for ID ${id} requires valid CSRF token` };
  }

  /**
   * DELETE request - requires CSRF token
   */
  @Delete(':id')
  remove(@Param('id') id: string) {
    return { message: `This DELETE request for ID ${id} requires valid CSRF token` };
  }
}

/**
 * Example 2: Webhook Controller with CSRF Exclusion
 * Webhooks from external services should exclude CSRF protection
 */
@Controller('api/v1/webhooks')
export class WebhookController {
  /**
   * Stripe webhook - excluded from CSRF protection
   * External services can't provide our CSRF tokens
   */
  @Post('stripe')
  @ExcludeCsrf()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleStripeWebhook(@Body() _webhook: any) {
    return { message: 'This webhook does not require CSRF token' };
  }

  /**
   * Payment gateway callback - excluded
   */
  @Post('payment-callback')
  @ExcludeCsrf()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handlePaymentCallback(@Body() _callback: any) {
    return { message: 'This callback does not require CSRF token' };
  }
}

/**
 * Example 3: Public API Controller
 * Some public endpoints might need CSRF exclusion
 */
@Controller('api/v1/public')
export class PublicController {
  /**
   * Public search endpoint - excluded from CSRF
   * Read-only operations can be excluded
   */
  @Get('search')
  @ExcludeCsrf()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  search(@Body() _searchDto: any) {
    return { message: 'This search endpoint does not require CSRF token' };
  }

  /**
   * Contact form submission - requires CSRF
   * State-changing operations should have CSRF protection
   */
  @Post('contact')
  @UseGuards(CsrfGuard)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  submitContactForm(@Body() _contactDto: any) {
    return { message: 'This contact form requires valid CSRF token' };
  }
}

/**
 * Example 4: Mixed Protection Controller
 * Some routes protected, some excluded
 */
@Controller('api/v1/mixed')
export class MixedController {
  /**
   * Public endpoint - no CSRF required
   */
  @Get('info')
  @ExcludeCsrf()
  getInfo() {
    return { message: 'No CSRF required for this GET request' };
  }

  /**
   * Protected endpoint - CSRF required
   */
  @Post('subscribe')
  @UseGuards(CsrfGuard)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subscribe(@Body() _subscribeDto: any) {
    return { message: 'This subscription requires valid CSRF token' };
  }

  /**
   * Admin endpoint - CSRF required
   */
  @Put('admin/settings')
  @UseGuards(CsrfGuard)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateSettings(@Body() _settings: any) {
    return { message: 'This admin endpoint requires valid CSRF token' };
  }
}

/**
 * Frontend Integration Example
 *
 * TypeScript/JavaScript example for frontend usage:
 *
 * ```typescript
 * // Service class to handle CSRF tokens
 * class ApiService {
 *   private csrfToken: string | null = null;
 *
 *   // Get CSRF token from API
 *   async getCsrfToken(): Promise<string> {
 *     const response = await fetch('http://localhost:3001/api/csrf/token', {
 *       method: 'GET',
 *       credentials: 'include',
 *     });
 *
 *     this.csrfToken = response.headers.get('X-CSRF-Token');
 *     return this.csrfToken!;
 *   }
 *
 *   // Make POST request with CSRF token
 *   async postData(url: string, data: any): Promise<any> {
 *     if (!this.csrfToken) {
 *       await this.getCsrfToken();
 *     }
 *
 *     const response = await fetch(url, {
 *       method: 'POST',
 *       headers: {
 *         'Content-Type': 'application/json',
 *         'X-CSRF-Token': this.csrfToken!,
 *       },
 *       credentials: 'include',
 *       body: JSON.stringify(data),
 *     });
 *
 *     // Update token from response
 *     const newToken = response.headers.get('X-CSRF-Token');
 *     if (newToken) {
 *       this.csrfToken = newToken;
 *     }
 *
 *     return response.json();
 *   }
 *
 *   // Make GET request (automatically refreshes token)
 *   async getData(url: string): Promise<any> {
 *     const response = await fetch(url, {
 *       method: 'GET',
 *       credentials: 'include',
 *     });
 *
 *     // Update token from response
 *     const newToken = response.headers.get('X-CSRF-Token');
 *     if (newToken) {
 *       this.csrfToken = newToken;
 *     }
 *
 *     return response.json();
 *   }
 * }
 *
 * // Usage example
 * const api = new ApiService();
 *
 * // Get initial token
 * await api.getCsrfToken();
 *
 * // Make POST request
 * const result = await api.postData('http://localhost:3001/api/v1/example', {
 *   name: 'Test',
 * });
 * ```
 */
