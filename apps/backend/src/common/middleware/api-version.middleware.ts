import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export const SUPPORTED_API_VERSIONS = ['1'];

const SKIP_PATHS = [
  '/api/docs',
  '/api/docs-json',
  '/api/docs-yaml',
  '/health',
  '/metrics',
];

const VERSION_PATTERN = /^\/api\/v(\d+)\//;
const API_PREFIX_PATTERN = /^\/api\//;

interface JsonApiError {
  status: string;
  code: string;
  title: string;
  detail: string;
  source: { parameter: string };
}

interface JsonApiErrorResponse {
  errors: JsonApiError[];
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      apiVersion?: string;
    }
  }
}

@Injectable()
export class ApiVersionMiddleware implements NestMiddleware {
  private readonly supportedVersions: string[];

  constructor(supportedVersions: string[] = SUPPORTED_API_VERSIONS) {
    this.supportedVersions = supportedVersions;
  }

  use(req: Request, res: Response, next: NextFunction): void {
    const path = req.originalUrl || req.url;

    if (SKIP_PATHS.some((skipPath) => path.startsWith(skipPath))) {
      next();
      return;
    }

    if (!API_PREFIX_PATTERN.test(path)) {
      next();
      return;
    }

    const versionMatch = path.match(VERSION_PATTERN);

    if (versionMatch) {
      const requestedVersion = versionMatch[1]!;

      if (!this.supportedVersions.includes(requestedVersion)) {
        const supportedList = this.supportedVersions.map((v) => `v${v}`).join(', ');
        const errorResponse: JsonApiErrorResponse = {
          errors: [
            {
              status: '400',
              code: 'UNSUPPORTED_API_VERSION',
              title: 'Unsupported API Version',
              detail: `API version 'v${requestedVersion}' is not supported. Supported versions: ${supportedList}`,
              source: { parameter: 'version' },
            },
          ],
        };
        res.status(400).json(errorResponse);
        return;
      }

      req.apiVersion = requestedVersion;
      res.setHeader('X-API-Version', `v${requestedVersion}`);
      next();
      return;
    }

    const rewrittenPath = path.replace(/^\/api\//, `/api/v${this.supportedVersions[0]}/`);
    req.url = rewrittenPath;

    const queryStringIndex = req.originalUrl.indexOf('?');
    const queryString = queryStringIndex !== -1 ? req.originalUrl.substring(queryStringIndex) : '';
    req.originalUrl = rewrittenPath + queryString;

    req.apiVersion = this.supportedVersions[0];
    res.setHeader('X-API-Version', `v${this.supportedVersions[0]}`);
    next();
  }
}
