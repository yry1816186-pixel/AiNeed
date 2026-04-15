import { AsyncLocalStorage } from 'async_hooks';

import { Injectable, LoggerService, Scope, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import pino, { Logger, LoggerOptions } from 'pino';

const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'secret',
  'creditCard',
  'cvv',
  'ssn',
  'phone',
  'mobile',
  'idCard',
  'encryptionKey',
  'privateKey',
];

interface RequestContext {
  requestId: string;
  userId?: string;
  [key: string]: unknown;
}

@Injectable({ scope: Scope.DEFAULT })
export class PinoLoggerService implements LoggerService {
  private readonly pino: Logger;
  private readonly context?: string;
  private readonly serviceName: string;
  private readonly asyncLocalStorage: AsyncLocalStorage<RequestContext>;

  constructor(
    private readonly configService: ConfigService,
    @Optional() asyncLocalStorage?: AsyncLocalStorage<RequestContext>,
    @Optional() context?: string,
  ) {
    this.context = context;
    this.serviceName = this.configService.get<string>('SERVICE_NAME', 'xuno-backend');
    this.asyncLocalStorage = asyncLocalStorage || new AsyncLocalStorage<RequestContext>();
    this.pino = this.createLogger();
  }

  private createLogger(): Logger {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    const logLevel = this.configService.get<string>('LOG_LEVEL', nodeEnv === 'production' ? 'warn' : 'debug');
    const isProduction = nodeEnv === 'production';

    const options: LoggerOptions = {
      level: logLevel,
      formatters: {
        level(label) {
          return { level: label };
        },
        bindings(bindings) {
          return {
            service: bindings.name || 'xuno-backend',
            pid: bindings.pid,
          };
        },
        log(object) {
          return object;
        },
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      redact: {
        paths: SENSITIVE_FIELDS.map((field) => `*.${field}`),
        censor: '[REDACTED]',
      },
      serializers: {
        err: pino.stdSerializers.err,
        req: pino.stdSerializers.req,
        res: pino.stdSerializers.res,
      },
    };

    if (isProduction) {
      return pino(options);
    }

    return pino(options, pino.transport({
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
        ignore: 'pid,hostname',
        singleLine: true,
      },
    }));
  }

  private getTraceId(): string | undefined {
    const store = this.asyncLocalStorage.getStore();
    return store?.requestId;
  }

  private getUserId(): string | undefined {
    const store = this.asyncLocalStorage.getStore();
    return store?.userId;
  }

  private enrichMeta(meta?: Record<string, unknown>): Record<string, unknown> {
    const enriched: Record<string, unknown> = {};

    const traceId = this.getTraceId();
    if (traceId) {
      enriched.traceId = traceId;
    }

    const userId = this.getUserId();
    if (userId) {
      enriched.userId = userId;
    }

    if (this.context) {
      enriched.context = this.context;
    }

    if (meta) {
      const sanitized = this.sanitizeData(meta);
      Object.assign(enriched, sanitized);
    }

    return enriched;
  }

  private sanitizeData(data: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();

      if (SENSITIVE_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()))) {
        sanitized[key] = this.maskValue(value);
      } else if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value, key);
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeData(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private sanitizeString(value: string, key: string): string {
    const lowerKey = key.toLowerCase();

    if (lowerKey.includes('email') && value.includes('@')) {
      const parts = value.split('@');
      const localPart = parts[0];
      const domain = parts[1];
      if (localPart && domain) {
        return `${localPart.charAt(0)}***@${domain}`;
      }
    }

    if (lowerKey.includes('phone') || lowerKey.includes('mobile')) {
      if (/^\d{11}$/.test(value)) {
        return value.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
      }
    }

    if (lowerKey.includes('idcard') || lowerKey.includes('id_card')) {
      if (/^\d{17}[\dXx]$/.test(value)) {
        return value.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2');
      }
    }

    return value;
  }

  private maskValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '[REDACTED]';
    }

    const strValue = String(value);
    if (strValue.length <= 4) {
      return '****';
    }

    return strValue.substring(0, 2) + '****' + strValue.substring(strValue.length - 2);
  }

  verbose(message: string, context?: string, ...optionalParams: unknown[]): void {
    const meta = this.buildMeta(context, optionalParams);
    this.pino.trace(meta, message);
  }

  debug(message: string, context?: string, ...optionalParams: unknown[]): void {
    const meta = this.buildMeta(context, optionalParams);
    this.pino.debug(meta, message);
  }

  log(message: string, context?: string, ...optionalParams: unknown[]): void {
    const meta = this.buildMeta(context, optionalParams);
    this.pino.info(meta, message);
  }

  warn(message: string, context?: string, ...optionalParams: unknown[]): void {
    const meta = this.buildMeta(context, optionalParams);
    this.pino.warn(meta, message);
  }

  error(message: string, trace?: string, context?: string, ...optionalParams: unknown[]): void {
    const meta = this.buildMeta(context, optionalParams);
    if (trace) {
      meta.stack = trace;
    }
    this.pino.error(meta, message);
  }

  private buildMeta(
    context?: string,
    optionalParams?: unknown[],
  ): Record<string, unknown> {
    const meta = this.enrichMeta();

    if (context) {
      meta.context = context;
    }

    if (optionalParams && optionalParams.length > 0) {
      const lastParam = optionalParams[optionalParams.length - 1];
      if (lastParam && typeof lastParam === 'object' && !Array.isArray(lastParam)) {
        Object.assign(meta, this.sanitizeData(lastParam as Record<string, unknown>));
      }
    }

    return meta;
  }

  setContext(context: string): void {
    (this as unknown as { context?: string }).context = context;
  }

  createChildLogger(context: string): PinoChildLogger {
    return new PinoChildLogger(this, context);
  }

  getAsyncLocalStorage(): AsyncLocalStorage<RequestContext> {
    return this.asyncLocalStorage;
  }
}

export class PinoChildLogger {
  constructor(
    private readonly logger: PinoLoggerService,
    private readonly context: string,
  ) {}

  debug(message: string, data?: Record<string, unknown>): void {
    this.logger.debug(message, this.context, data);
  }

  log(message: string, data?: Record<string, unknown>): void {
    this.logger.log(message, this.context, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.logger.log(message, this.context, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.logger.warn(message, this.context, data);
  }

  error(message: string, trace?: string, data?: Record<string, unknown>): void {
    this.logger.error(message, trace, this.context, data);
  }
}
