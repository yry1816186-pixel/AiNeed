import { resolve } from "path";

import { Module, MiddlewareConsumer, RequestMethod, NestModule } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_INTERCEPTOR, APP_GUARD } from "@nestjs/core";
import { JwtAuthGuard } from "./modules/auth/guards/jwt-auth.guard";
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
import { AddressModule } from "./modules/address/address.module";
import { AdminModule } from "./modules/admin/admin.module";
import { AIModule } from "./domains/ai-core/ai/ai.module";
import { AISafetyModule } from "./domains/ai-core/ai-safety/ai-safety.module";
import { AiStylistModule } from "./domains/ai-core/ai-stylist/ai-stylist.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { AuthModule } from "./modules/auth/auth.module";
import { BrandsModule } from "./domains/fashion/brands/brands.module";
import { BloggerModule } from "./modules/blogger/blogger.module";
import { CacheModule } from "./modules/cache/cache.module";
import { CacheService } from "./modules/cache/cache.service";
import { CartModule } from "./modules/cart/cart.module";
import { ChatModule } from "./modules/chat/chat.module";
import { ClothingModule } from "./domains/fashion/clothing/clothing.module";
import { CommunityModule } from "./modules/community/community.module";
import { ConsultantModule } from "./modules/consultant/consultant.module";
import { CouponModule } from "./modules/coupon/coupon.module";
import { CustomizationModule } from "./modules/customization/customization.module";
import { DatabaseModule } from "./modules/database/database.module";
import { WardrobeModule } from "./domains/fashion/wardrobe/wardrobe.module";
import { FeatureFlagModule } from "./modules/feature-flags/feature-flag.module";
import { HealthModule } from "./modules/health/health.module";
import { MerchantModule } from "./modules/merchant/merchant.module";
import { MetricsModule } from "./modules/metrics/metrics.module";
import { MetricsService } from "./modules/metrics/metrics.service";
import { NotificationModule } from "./modules/notification/notification.module";
import { OnboardingModule } from "./modules/onboarding/onboarding.module";
import { OrderModule } from "./modules/order/order.module";
import { PaymentModule } from "./modules/payment/payment.module";
import { PhotosModule } from "./domains/ai-core/photos/photos.module";
import { PrivacyModule } from "./modules/privacy/privacy.module";
import { ProfileModule } from "./modules/profile/profile.module";
import { QueueModule } from "./modules/queue/queue.module";
import { RecommendationsModule } from "./domains/platform/recommendations/recommendations.module";
import { RefundRequestModule } from "./modules/refund-request/refund-request.module";
import { SearchModule } from "./domains/fashion/search/search.module";
import { SecurityModule } from "./modules/security/security.module";
import { ShareTemplateModule } from "./modules/share-template/share-template.module";
import { SizeRecommendationModule } from "./modules/size-recommendation/size-recommendation.module";
import { StockNotificationModule } from "./modules/stock-notification/stock-notification.module";
import { StyleAssessmentModule } from "./domains/fashion/style-assessment/style-assessment.module";
import { SubscriptionModule } from "./modules/subscription/subscription.module";
import { SystemReadinessService } from "./modules/system/system-readiness.service";
import { TryOnModule } from "./domains/ai-core/try-on/try-on.module";
import { UsersModule } from "./modules/users/users.module";
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
    AuthModule,
    UsersModule,
    ProfileModule,
    PhotosModule,
    ClothingModule,
    CommunityModule,
    TryOnModule,
    RecommendationsModule,
    CustomizationModule,
    SearchModule,
    WardrobeModule,
    BrandsModule,
    BloggerModule,
    AnalyticsModule,
    SubscriptionModule,
    NotificationModule,
    OnboardingModule,
    PrivacyModule,
    MerchantModule,
    AiStylistModule,
    HealthModule,
    PaymentModule,
    CartModule,
    OrderModule,
    AddressModule,
    AIModule,
    StyleAssessmentModule,
    WeatherModule,
    MetricsModule,
    QueueModule,
    WSModule,
    AISafetyModule,
    ShareTemplateModule,
    ConsultantModule,
    ChatModule,
    FeatureFlagModule,
    CouponModule,
    StockNotificationModule,
    RefundRequestModule,
    SizeRecommendationModule,
    AdminModule,
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
