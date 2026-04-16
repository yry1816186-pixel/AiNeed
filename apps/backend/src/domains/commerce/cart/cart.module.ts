/* eslint-disable @typescript-eslint/no-explicit-any */
import { Module } from "@nestjs/common";

import { PrismaModule } from "../../../common/prisma/prisma.module";
import { AuthModule } from "../../../domains/identity/auth/auth.module";
import { CouponModule } from "../coupon/coupon.module";

import { CartController } from "./cart.controller";
import { CartService } from "./cart.service";

@Module({
  imports: [PrismaModule, AuthModule, CouponModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
