/* eslint-disable @typescript-eslint/no-explicit-any */
import { Module } from '@nestjs/common';
import { CartModule } from './cart/cart.module';
import { CouponModule } from './coupon/coupon.module';
import { OrderModule } from './order/order.module';
import { PaymentModule } from './payment/payment.module';
import { RefundRequestModule } from './refund-request/refund-request.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { AddressModule } from './address/address.module';
import { SizeRecommendationModule } from './size-recommendation/size-recommendation.module';

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
