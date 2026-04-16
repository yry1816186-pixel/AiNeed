import { resolve } from "path";

import { Module, MiddlewareConsumer, RequestMethod, NestModule } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_INTERCEPTOR, APP_GUARD } from "@nestjs/core";
import { JwtAuthGuard } from "./domains/identity/auth/guards/jwt-auth.guard";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { MulterModule } from "@nestjs/platform-express";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";

import { envValidationFactory } from "./common/config/env.validation";
import { EmailModule } from "./common/email/email.module";
import { EncryptionModule } from "./common/encryption/encryption.module";
import { GatewayModule } from "./common/gateway/gateway.module";
import { CsrfModule } from "./common/guards/csrf/csrf.module";
import { JsonApiInterceptor, CacheInterceptor, PerformanceInterceptor } from "./common/interceptors";
import { LoggingModule } from "./common/logging";
import { SoftDeleteMiddleware } from "./common/middleware";
import { PrismaModule } from "./common/prisma/prisma.module";
import { RedisModule } from "./common/redis/redis.module";
import { SentryModule } from "./common/sentry";
import { SoftDeleteModule } from "./common/soft-delete";
import { StorageModule } from "./common/storage/storage.module";
import { AdminModule } from "./domains/platform/admin/admin.module";
import { AIModule } from "./domains/ai-core/ai/ai.module";
import { AISafetyModule } from "./domains/ai-core/ai-safety/ai-safety.module";
import { AiStylistModule } from "./domains/ai-core/ai-stylist/ai-stylist.module";
import { AnalyticsModule } from "./domains/platform/analytics/analytics.module";
import { AuthModule } from "./domains/identity/auth/auth.module";
import { BrandsModule } from "./domains/fashion/brands/brands.module";
import { BloggerModule } from "./domains/social/blogger/blogger.module";
import { CacheModule } from "./modules/cache/cache.module";
import { CacheService } from "./modules/cache/cache.service";
import { ChatModule } from "./domains/social/chat/chat.module";
import { ClothingModule } from "./domains/fashion/clothing/clothing.module";
import { CommerceModule } from "./domains/commerce/commerce.module";
import { CommunityModule } from "./domains/social/community/community.module";
import { ConsultantModule } from "./domains/social/consultant/consultant.module";
import { CustomizationModule } from "./domains/customization/customization/customization.module";
import { DatabaseModule } from "./modules/database/database.module";
import { WardrobeModule } from "./domains/fashion/wardrobe/wardrobe.module";
import { FeatureFlagModule } from "./domains/platform/feature-flags/feature-flag.module";
import { HealthModule } from "./domains/platform/health/health.module";
import { MerchantModule } from "./domains/platform/merchant/merchant.module";
import { MetricsModule } from "./domains/platform/metrics/metrics.module";
import { MetricsService } from "./domains/platform/metrics/metrics.service";
import { NotificationModule } from "./domains/platform/notification/notification.module";
import { OnboardingModule } from "./domains/identity/onboarding/onboarding.module";
import { PhotosModule } from "./domains/ai-core/photos/photos.module";
import { PrivacyModule } from "./domains/identity/privacy/privacy.module";
import { ProfileModule } from "./domains/identity/profile/profile.module";
import { QueueModule } from "./domains/platform/queue/queue.module";
import { RecommendationsModule } from "./domains/platform/recommendations/recommendations.module";
import { SearchModule } from "./domains/fashion/search/search.module";
import { SecurityModule } from "./modules/security/security.module";
import { ShareTemplateModule } from "./domains/customization/share-template/share-template.module";
import { StyleAssessmentModule } from "./domains/fashion/style-assessment/style-assessment.module";
import { SystemReadinessService } from "./modules/system/system-readiness.service";
import { TryOnModule } from "./domains/ai-core/try-on/try-on.module";
import { UsersModule } from "./domains/identity/users/users.module";
import { WeatherModule } from "./domains/fashion/weather/weather.module";
import { WSModule } from "./modules/ws/ws.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        resolve(process.cwd(), ".env.local"),
        resolve(process.cwd(), "../../.env.local"),
        resolve(process.cwd(), "../../.env"),
        resolve(process.cwd(), ".env"),
      ],
      validate: envValidationFactory,
    }),
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    ScheduleModule.forRoot(),
    MulterModule.register({
      limits: {
        fileSize: 10 * 1024 * 1024,
        files: 1,
      },
    }),
    LoggingModule.forRoot(),
    SentryModule.forRoot(),
    // Common Infrastructure
    PrismaModule,
    RedisModule,
    StorageModule,
    GatewayModule,
    CsrfModule,
    SoftDeleteModule,
    SecurityModule,
    EmailModule,
    DatabaseModule,
    CacheModule,

    // Identity Domain
    AuthModule,
    UsersModule,
    ProfileModule,
    OnboardingModule,
    PrivacyModule,

    // AI Core Domain
    PhotosModule,
    TryOnModule,
    AiStylistModule,
    AIModule,
    AISafetyModule,

    // Fashion Domain
    ClothingModule,
    SearchModule,
    WardrobeModule,
    BrandsModule,
    StyleAssessmentModule,
    WeatherModule,

    // Commerce Domain
    CommerceModule,
    CustomizationModule,
    ShareTemplateModule,

    // Social Domain
    CommunityModule,
    BloggerModule,
    ConsultantModule,
    ChatModule,

    // Platform Layer
    RecommendationsModule,
    AnalyticsModule,
    NotificationModule,
    MerchantModule,
    HealthModule,
    MetricsModule,
    QueueModule,
    FeatureFlagModule,
    AdminModule,

    // Unmigrated Modules
    WSModule,
  ],
  providers: [
    SystemReadinessService,
    {
      provide: APP_INTERCEPTOR,
      useClass: JsonApiInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: PerformanceInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(SoftDeleteMiddleware).forRoutes('*');
  }
}
