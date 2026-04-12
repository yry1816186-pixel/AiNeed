import { Module } from '@nestjs/common';
import { DesignMarketController } from './design-market.controller';
import { DesignMarketService } from './design-market.service';
import { MockContentReviewProvider } from './providers/mock-content-review.provider';
import { CONTENT_REVIEW_PROVIDER } from './providers/content-review.interface';

@Module({
  controllers: [DesignMarketController],
  providers: [
    DesignMarketService,
    {
      provide: CONTENT_REVIEW_PROVIDER,
      useClass: MockContentReviewProvider,
    },
  ],
  exports: [DesignMarketService],
})
export class DesignMarketModule {}
