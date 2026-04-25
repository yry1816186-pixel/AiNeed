import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { PrismaModule } from "../../common/prisma/prisma.module";
import { RecommendationsModule } from "../platform/recommendations/recommendations.module";

import { AddressModule } from "./address/address.module";
import { CartModule } from "./cart/cart.module";
import { CouponModule } from "./coupon/coupon.module";
import { OrderModule } from "./order/order.module";
import { PaymentModule } from "./payment/payment.module";
import { RefundRequestModule } from "./refund-request/refund-request.module";
import { SizeRecommendationModule } from "./size-recommendation/size-recommendation.module";
import { SubscriptionModule } from "./subscription/subscription.module";
import { JDClientService } from "./services/jd-client.service";
import { ProductSyncService } from "./services/product-sync.service";
import { TaobaoClientService } from "./services/taobao-client.service";
import { SYNC_QUEUE , SyncSchedulerService } from "./sync/sync-scheduler.service";

@Module({
  imports: [
    CartModule,
    CouponModule,
    OrderModule,
    PaymentModule,
    RefundRequestModule,
    SubscriptionModule,
    AddressModule,
    SizeRecommendationModule,
    // Dependencies for data pipeline
    ConfigModule,
    PrismaModule,
    RecommendationsModule,
    // BullMQ queue for sync scheduling
    BullModule.registerQueue({
      name: SYNC_QUEUE,
    }),
  ],
  providers: [
    // E-commerce API clients
    TaobaoClientService,
    JDClientService,
    // Product sync service
    ProductSyncService,
    // Scheduled sync
    SyncSchedulerService,
  ],
  exports: [
    CartModule,
    CouponModule,
    OrderModule,
    PaymentModule,
    RefundRequestModule,
    SubscriptionModule,
    AddressModule,
    SizeRecommendationModule,
    // Export data pipeline services for use in other domains
    TaobaoClientService,
    JDClientService,
    ProductSyncService,
    SyncSchedulerService,
  ],
})
export class CommerceModule {}
