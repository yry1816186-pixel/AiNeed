import { resolve } from "path";

import { Module, MiddlewareConsumer, RequestMethod, NestModule } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerModule } from "@nestjs/throttler";
import { MulterModule } from "@nestjs/platform-express";

import { envValidationFactory } from "./common/config/env.validation";
import { EncryptionModule } from "./common/encryption/encryption.module";
import { GatewayModule } from "./common/gateway/gateway.module";
import { CsrfModule } from "./common/guards/csrf/csrf.module";
import { LoggingModule } from "./common/logging";
import { SentryModule } from "./common/sentry";
import { SoftDeleteMiddleware } from "./common/middleware";
import { PrismaModule } from "./common/prisma/prisma.module";
import { RedisModule } from "./common/redis/redis.module";
import { SoftDeleteModule } from "./common/soft-delete";
import { StorageModule } from "./common/storage/storage.module";
import { AddressModule } from "./modules/address/address.module";
import { AIModule } from "./modules/ai/ai.module";
import { AISafetyModule } from "./modules/ai-safety/ai-safety.module";
import { CodeRagModule } from "./modules/code-rag/code-rag.module";
import { AiStylistModule } from "./modules/ai-stylist/ai-stylist.module";
import { AnalyticsModule } from "./modules/analytics/analytics.module";
import { AuthModule } from "./modules/auth/auth.module";
import { BrandsModule } from "./modules/brands/brands.module";
import { CacheModule } from "./modules/cache/cache.module";
import { CartModule } from "./modules/cart/cart.module";
import { ClothingModule } from "./modules/clothing/clothing.module";
import { CommunityModule } from "./modules/community/community.module";
import { CustomizationModule } from "./modules/customization/customization.module";
import { DatabaseModule } from "./modules/database/database.module";
import { FavoritesModule } from "./modules/favorites/favorites.module";
import { HealthModule } from "./modules/health/health.module";
import { MerchantModule } from "./modules/merchant/merchant.module";
import { MetricsModule } from "./modules/metrics/metrics.module";
import { NotificationModule } from "./modules/notification/notification.module";
import { OrderModule } from "./modules/order/order.module";
import { PaymentModule } from "./modules/payment/payment.module";
import { PhotosModule } from "./modules/photos/photos.module";
import { PrivacyModule } from "./modules/privacy/privacy.module";
import { ProfileModule } from "./modules/profile/profile.module";
import { QueueModule } from "./modules/queue/queue.module";
import { RecommendationsModule } from "./modules/recommendations/recommendations.module";
import { SearchModule } from "./modules/search/search.module";
import { StyleProfilesModule } from "./modules/style-profiles/style-profiles.module";
import { SubscriptionModule } from "./modules/subscription/subscription.module";
import { TryOnModule } from "./modules/try-on/try-on.module";
import { UsersModule } from "./modules/users/users.module";
import { WeatherModule } from "./modules/weather/weather.module";
import { WSModule } from "./modules/ws/ws.module";
import { DemoModule } from "./modules/demo/demo.module";

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
        fileSize: 10 * 1024 * 1024, // 全局默认 10MB 文件大小限制
        files: 1, // 默认单次请求最多 1 个文件
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
    FavoritesModule,
    BrandsModule,
    AnalyticsModule,
    SubscriptionModule,
    NotificationModule,
    PrivacyModule,
    MerchantModule,
    AiStylistModule,
    HealthModule,
    PaymentModule,
    CartModule,
    OrderModule,
    AddressModule,
    AIModule,
    StyleProfilesModule,
    WeatherModule,
    MetricsModule,
    QueueModule,
    WSModule,
    AISafetyModule,
    CodeRagModule,
    DemoModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // 应用软删除中间件到所有路由
    consumer.apply(SoftDeleteMiddleware).forRoutes('*');
  }
}
