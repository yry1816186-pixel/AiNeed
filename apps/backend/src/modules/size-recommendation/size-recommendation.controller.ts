import {
  Controller,
  Get,
  Param,
  UseGuards,
  Req,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

import { SizeRecommendationService } from "./size-recommendation.service";

@ApiTags("size-recommendation")
@Controller("size-recommendation")
export class SizeRecommendationController {
  constructor(
    private readonly sizeRecommendationService: SizeRecommendationService,
  ) {}

  @Get(":itemId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get AI size recommendation" })
  async getRecommendation(
    @Req() req: { user: { id: string } },
    @Param("itemId") itemId: string,
  ) {
    const result = await this.sizeRecommendationService.getRecommendation(
      req.user.id,
      itemId,
    );
    return result ?? { recommendedSize: null, confidence: null, reasons: [] };
  }

  @Get(":itemId/chart")
  @ApiOperation({ summary: "Get size chart" })
  async getSizeChart(@Param("itemId") itemId: string) {
    return this.sizeRecommendationService.getSizeChart(itemId);
  }
}
