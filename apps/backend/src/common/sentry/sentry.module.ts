import { Global, Module, DynamicModule } from "@nestjs/common";

import { SentryInterceptor } from "./sentry.interceptor";
import { SentryService } from "./sentry.service";

@Global()
@Module({})
export class SentryModule {
  static forRoot(): DynamicModule {
    return {
      module: SentryModule,
      providers: [SentryService, SentryInterceptor],
      exports: [SentryService, SentryInterceptor],
      global: true,
    };
  }
}

export { SentryService, SentryInterceptor };
