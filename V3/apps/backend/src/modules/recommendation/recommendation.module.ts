import { Module } from '@nestjs/common';
import { RecommendationController } from './recommendation.controller';
import { RecommendationService } from './recommendation.service';
import { ContentBasedChannel } from './channels/content-based.channel';
import { CollaborativeChannel } from './channels/collaborative.channel';
import { TrendingChannel } from './channels/trending.channel';
import { RecommendationRedisProvider } from './redis.provider';

@Module({
  controllers: [RecommendationController],
  providers: [
    RecommendationRedisProvider,
    RecommendationService,
    ContentBasedChannel,
    CollaborativeChannel,
    TrendingChannel,
  ],
  exports: [RecommendationService],
})
export class RecommendationModule {}
