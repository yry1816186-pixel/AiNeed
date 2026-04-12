import { Module } from '@nestjs/common';
import { BodyAnalysisController } from './body-analysis.controller';
import { BodyAnalysisService } from './body-analysis.service';

@Module({
  controllers: [BodyAnalysisController],
  providers: [BodyAnalysisService],
  exports: [BodyAnalysisService],
})
export class BodyAnalysisModule {}
