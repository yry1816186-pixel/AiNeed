import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { validate } from './config/env';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { UploadModule } from './modules/upload/upload.module';
import { ClothingModule } from './modules/clothing/clothing.module';
import { StylistModule } from './modules/stylist/stylist.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { EmbeddingModule } from './modules/embedding/embedding.module';
import { RecommendationModule } from './modules/recommendation/recommendation.module';
import { SearchModule } from './modules/search/search.module';
import { WardrobeModule } from './modules/wardrobe/wardrobe.module';
import { FavoritesModule } from './modules/favorites/favorites.module';
import { CommunityModule } from './modules/community/community.module';
import { SocialModule } from './modules/social/social.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { NotificationModule } from './modules/notification/notification.module';
import { BodyAnalysisModule } from './modules/body-analysis/body-analysis.module';
import { AvatarModule } from './modules/avatar/avatar.module';
import { AvatarTemplateModule } from './modules/avatar-template/avatar-template.module';
import { CustomizeModule } from './modules/customize/customize.module';
import { CustomOrderModule } from './modules/custom-order/custom-order.module';
import { DesignMarketModule } from './modules/design-market/design-market.module';
import { BespokeModule } from './modules/bespoke/bespoke.module';
import { OutfitImageModule } from './modules/outfit-image/outfit-image.module';
import { OutfitModule } from './modules/outfit/outfit.module';
import { HealthModule } from './modules/health/health.module';
import { GatewayModule } from './modules/gateway/gateway.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('RATE_LIMIT_TTL', 60) * 1000,
          limit: configService.get<number>('RATE_LIMIT_MAX', 100),
        },
      ],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    UploadModule,
    ClothingModule,
    StylistModule,
    KnowledgeModule,
    EmbeddingModule,
    RecommendationModule,
    SearchModule,
    WardrobeModule,
    FavoritesModule,
    CommunityModule,
    SocialModule,
    MessagingModule,
    NotificationModule,
    BodyAnalysisModule,
    AvatarModule,
    AvatarTemplateModule,
    CustomizeModule,
    CustomOrderModule,
    DesignMarketModule,
    BespokeModule,
    OutfitImageModule,
    OutfitModule,
    HealthModule,
    GatewayModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
