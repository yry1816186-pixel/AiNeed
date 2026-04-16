/* eslint-disable @typescript-eslint/no-explicit-any */
﻿import { Module } from "@nestjs/common";

import { PrismaModule } from "../../../common/prisma/prisma.module";

import { SizeRecommendationController } from "./size-recommendation.controller";
import { SizeRecommendationService } from "./size-recommendation.service";

@Module({
  imports: [PrismaModule],
  controllers: [SizeRecommendationController],
  providers: [SizeRecommendationService],
  exports: [SizeRecommendationService],
})
export class SizeRecommendationModule {}
