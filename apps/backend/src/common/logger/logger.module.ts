import { AsyncLocalStorage } from 'async_hooks';

import { Module, Global, Provider, DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { TraceIdMiddleware } from './logger.middleware';
import { PinoLoggerService, PinoChildLogger } from './logger.service';

export const PINO_ASYNC_LOCAL_STORAGE = 'PINO_ASYNC_LOCAL_STORAGE';

interface RequestContext {
  requestId: string;
  userId?: string;
  [key: string]: unknown;
}

export interface LoggerModuleOptions {
  isGlobal?: boolean;
}

@Global()
@Module({})
export class LoggerModule {
  static forRoot(options: LoggerModuleOptions = {}): DynamicModule {
    const asyncLocalStorageProvider: Provider = {
      provide: PINO_ASYNC_LOCAL_STORAGE,
      useValue: new AsyncLocalStorage<RequestContext>(),
    };

    const pinoLoggerProvider: Provider = {
      provide: PinoLoggerService,
      useFactory: (
        configService: ConfigService,
        asyncLocalStorage: AsyncLocalStorage<RequestContext>,
      ) => {
        return new PinoLoggerService(configService, asyncLocalStorage);
      },
      inject: [ConfigService, PINO_ASYNC_LOCAL_STORAGE],
    };

    return {
      module: LoggerModule,
      imports: [ConfigModule],
      providers: [
        asyncLocalStorageProvider,
        pinoLoggerProvider,
        TraceIdMiddleware,
      ],
      exports: [PinoLoggerService, PinoChildLogger, TraceIdMiddleware],
      global: options.isGlobal !== false,
    };
  }
}
