import { Logger, LogLevel } from '@nestjs/common';

type LogLevelType = 'debug' | 'info' | 'warn' | 'error';

interface LogMetadata {
  [key: string]: string | number | boolean | null | undefined;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'accesstoken',
  'refreshtoken',
  'apikey',
  'secret',
  'authorization',
  'cookie',
  'phone',
  'mobile',
  'email',
]);

const LEVEL_PRIORITY: Record<LogLevelType, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function maskSensitiveValue(value: string): string {
  if (value.length <= 4) {
    return '****';
  }
  return value.slice(0, 2) + '****' + value.slice(-2);
}

function maskPhone(phone: string): string {
  if (phone.length < 7) {
    return '****';
  }
  return phone.slice(0, 3) + '****' + phone.slice(-4);
}

function maskEmail(email: string): string {
  const atIndex = email.indexOf('@');
  if (atIndex <= 1) {
    return '****' + email.slice(atIndex);
  }
  return email.slice(0, 1) + '****' + email.slice(atIndex);
}

function maskValue(key: string, value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  const lowerKey = key.toLowerCase();
  if (lowerKey.includes('phone') || lowerKey.includes('mobile')) {
    return maskPhone(value);
  }
  if (lowerKey.includes('email')) {
    return maskEmail(value);
  }
  if (SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes('token') || lowerKey.includes('secret') || lowerKey.includes('password')) {
    return maskSensitiveValue(value);
  }
  return value;
}

function sanitizeMetadata(metadata: LogMetadata): LogMetadata {
  const sanitized: LogMetadata = {};
  for (const [key, value] of Object.entries(metadata)) {
    sanitized[key] = maskValue(key, value) as LogMetadata[string];
  }
  return sanitized;
}

function formatTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
}

function formatLogMessage(
  level: LogLevelType,
  context: string,
  message: string,
  metadata?: LogMetadata,
): string {
  const timestamp = formatTimestamp();
  const levelUpper = level.toUpperCase().padEnd(5);
  const contextPadded = context ? `[${context}]` : '';
  const metaStr = metadata && Object.keys(metadata).length > 0
    ? ' ' + JSON.stringify(sanitizeMetadata(metadata))
    : '';
  return `[${timestamp}] [${levelUpper}] ${contextPadded} ${message}${metaStr}`;
}

export class AppLogger extends Logger {
  private readonly minLevel: LogLevelType;

  constructor(context?: string) {
    super();
    if (context) {
      this.context = context;
    }
    const env = process.env.APP_ENV ?? 'development';
    this.minLevel = env === 'production' ? 'info' : 'debug';
  }

  private shouldLog(level: LogLevelType): boolean {
    return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[this.minLevel];
  }

  logRequest(
    method: string,
    url: string,
    statusCode: number,
    duration: number,
  ): void {
    if (!this.shouldLog('info')) return;
    const message = formatLogMessage('info', this.context ?? 'HTTP', `${method} ${url}`, {
      statusCode,
      duration,
    });
    super.log(message);
  }

  logError(message: string, stack?: string, context?: string): void {
    if (!this.shouldLog('error')) return;
    const meta: LogMetadata = {};
    if (stack) {
      meta.stack = stack.split('\n').slice(0, 3).join(' | ');
    }
    const formatted = formatLogMessage('error', context ?? this.context ?? 'Error', message, meta);
    super.error(formatted);
  }

  logDatabaseQuery(query: string, duration: number): void {
    if (!this.shouldLog('debug')) return;
    const truncated = query.length > 200 ? query.slice(0, 200) + '...' : query;
    const formatted = formatLogMessage('debug', this.context ?? 'Database', truncated, {
      duration,
    });
    super.debug(formatted);
  }

  logApiCall(
    provider: string,
    model: string,
    tokens: number,
    cost: number,
  ): void {
    if (!this.shouldLog('info')) return;
    const formatted = formatLogMessage('info', this.context ?? 'ExternalAPI', `API call to ${provider}`, {
      provider,
      model,
      tokens,
      cost,
    });
    super.log(formatted);
  }

  override debug(message: unknown, context?: string): void {
    if (!this.shouldLog('debug')) return;
    const formatted = formatLogMessage('debug', context ?? this.context ?? 'Debug', String(message));
    super.debug(formatted);
  }

  override log(message: unknown, context?: string): void {
    if (!this.shouldLog('info')) return;
    const formatted = formatLogMessage('info', context ?? this.context ?? 'App', String(message));
    super.log(formatted);
  }

  override warn(message: unknown, context?: string): void {
    if (!this.shouldLog('warn')) return;
    const formatted = formatLogMessage('warn', context ?? this.context ?? 'App', String(message));
    super.warn(formatted);
  }

  override error(message: unknown, stack?: string, context?: string): void {
    if (!this.shouldLog('error')) return;
    const formatted = formatLogMessage('error', context ?? this.context ?? 'App', String(message));
    super.error(formatted, stack);
  }

  static getLogLevels(): LogLevel[] {
    const env = process.env.APP_ENV ?? 'development';
    if (env === 'production') {
      return ['log', 'warn', 'error'];
    }
    return ['debug', 'log', 'warn', 'error'];
  }
}
