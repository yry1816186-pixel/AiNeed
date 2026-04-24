import { Module } from "@nestjs/common";

import { AddressModule } from "./address/address.module";
import { CartModule } from "./cart/cart.module";
import { CouponModule } from "./coupon/coupon.module";
import { OrderModule } from "./order/order.module";
import { PaymentModule } from "./payment/payment.module";
import { RefundRequestModule } from "./refund-request/refund-request.module";
import { SizeRecommendationModule } from "./size-recommendation/size-recommendation.module";
import { SubscriptionModule } from "./subscription/subscription.module";

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
  ],
})
export class CommerceModule {}
