import { Module, forwardRef } from "@nestjs/common";

import { PrismaModule } from "../../common/prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { CouponModule } from "../coupon/coupon.module";

import { CartController } from "./cart.controller";
import { CartService } from "./cart.service";

@Module({
  imports: [PrismaModule, AuthModule, forwardRef(() => CouponModule)],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
