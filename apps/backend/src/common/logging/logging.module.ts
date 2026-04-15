/**
 * @fileoverview Logging Module - 日志模块
 *
 * 提供统一的结构化日志服务，自动注入到所有模块中。
 *
 * @example
 * ```typescript
 * // 在AppModule中导入
 * @Module({
 *   imports: [LoggingModule.forRoot()],
 * })
 * export class AppModule {}
 *
 * // 在服务中使用
 * @Injectable()
 * export class AuthService {
 *   private readonly logger: ContextualLogger;
 *
 *   constructor(private readonly loggingService: StructuredLoggerService) {
 *     this.logger = loggingService.createChildLogger(AuthService.name);
 *   }
 *
 *   async login(email: string, password: string) {
 *     this.logger.log('用户登录', { email });
 *   }
 * }
 * ```
 */

import { AsyncLocalStorage } from "async_hooks";

import { Module, Global, Provider, DynamicModule, InjectionToken } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { RequestIdInterceptor } from "./request-id.interceptor";
import {
  StructuredLoggerService,
  RequestContext,
} from "./structured-logger.service";

/**
 * AsyncLocalStorage Provider Token
 */
export const ASYNC_LOCAL_STORAGE = "ASYNC_LOCAL_STORAGE";

/**
 * 日志模块配置选项
 */
export interface LoggingModuleOptions {
  /** 是否全局注册 */
  isGlobal?: boolean;
  /** 日志级别 */
  logLevel?: "debug" | "info" | "warn" | "error";
}

/**
 * 日志模块
 */
@Global()
@Module({})
export class LoggingModule {
  /**
   * 注册日志模块
   */
  static forRoot(options: LoggingModuleOptions = {}): DynamicModule {
    const providers: Provider[] = [
      {
        provide: ASYNC_LOCAL_STORAGE,
        useValue: new AsyncLocalStorage<RequestContext>(),
      },
      {
        provide: StructuredLoggerService,
        useFactory: (
          configService: ConfigService,
          asyncLocalStorage: AsyncLocalStorage<RequestContext>,
        ) => {
          return new StructuredLoggerService(configService, asyncLocalStorage);
        },
        inject: [ConfigService, ASYNC_LOCAL_STORAGE],
      },
      RequestIdInterceptor,
    ];

    return {
      module: LoggingModule,
      providers,
      exports: [StructuredLoggerService, RequestIdInterceptor],
      global: options.isGlobal !== false,
    };
  }

  /**
   * 注册日志模块（异步配置）
   */
  static forRootAsync(options: {
    useFactory: (...args: unknown[]) => Promise<LoggingModuleOptions> | LoggingModuleOptions;
    inject?: InjectionToken[];
  }): DynamicModule {
    const providers: Provider[] = [
      {
        provide: ASYNC_LOCAL_STORAGE,
        useValue: new AsyncLocalStorage<RequestContext>(),
      },
      {
        provide: StructuredLoggerService,
        useFactory: async (
          configService: ConfigService,
          asyncLocalStorage: AsyncLocalStorage<RequestContext>,
          ...args: unknown[]
        ) => {
          const moduleOptions = await options.useFactory(...args);
          if (moduleOptions.logLevel) {
            process.env.LOG_LEVEL = moduleOptions.logLevel;
          }
          return new StructuredLoggerService(configService, asyncLocalStorage);
        },
        inject: [ConfigService, ASYNC_LOCAL_STORAGE, ...(options.inject || [])] as InjectionToken[],
      },
      RequestIdInterceptor,
    ];

    return {
      module: LoggingModule,
      providers,
      exports: [StructuredLoggerService, RequestIdInterceptor],
      global: true,
    };
  }
}

// 导出类型和服务
export { StructuredLoggerService, ContextualLogger } from "./structured-logger.service";
export { RequestIdInterceptor } from "./request-id.interceptor";
