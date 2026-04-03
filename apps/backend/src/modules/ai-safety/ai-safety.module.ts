/**
 * AI Safety Module
 *
 * Provides hallucination detection and validation for LLM outputs
 * in the fashion recommendation system.
 *
 * Features:
 * - Response validation against fashion rules
 * - Knowledge base verification
 * - Hallucination detection metrics
 * - Safety logging and monitoring
 */

import { HttpModule } from '@nestjs/axios';
import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrometheusModule, makeCounterProvider, makeGaugeProvider, makeHistogramProvider } from '@willsoto/nestjs-prometheus';

import { AISafetyController } from './ai-safety.controller';
import { AISafetyService } from './ai-safety.service';

@Global()
@Module({
  imports: [ConfigModule, HttpModule, PrometheusModule],
  controllers: [AISafetyController],
  providers: [
    AISafetyService,
    makeCounterProvider({
      name: 'hallucination_detection_total',
      help: 'Total number of hallucination detections',
      labelNames: ['type', 'severity'],
    }),
    makeGaugeProvider({
      name: 'hallucination_rate',
      help: 'Current hallucination detection rate',
      labelNames: ['category'],
    }),
    makeHistogramProvider({
      name: 'validation_latency_seconds',
      help: 'Validation latency in seconds',
      buckets: [0.1, 0.5, 1, 2, 5],
    }),
  ],
  exports: [AISafetyService],
})
export class AISafetyModule {}
