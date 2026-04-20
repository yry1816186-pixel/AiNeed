import { Module } from "@nestjs/common";

import { ColorAnalysisService } from "./color-analysis.service";

@Module({
  providers: [ColorAnalysisService],
  exports: [ColorAnalysisService],
})
export class ColorAnalysisModule {}
