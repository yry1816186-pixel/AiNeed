/**
 * AI Safety Service
 *
 * Main service for LLM output validation and hallucination detection.
 * Integrates with Python ML service for advanced detection capabilities.
 *
 * 2026 AI Safety Best Practices Implementation
 */

import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { AxiosResponse } from 'axios';
import { Counter, Histogram, Gauge } from 'prom-client';
import { firstValueFrom } from 'rxjs';

// Types
export interface ValidationResult {
  isValid: boolean;
  confidenceScore: number;
  issues: DetectedIssue[];
  processingTimeMs: number;
  validatedAt: string;
}

export interface DetectedIssue {
  type: string;
  severity: 'error' | 'warning' | 'info';
  description: string;
  confidence: number;
  location?: string;
  suggestion?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details?: Record<string, any>;
}

export interface ValidationContext {
  occasion?: string;
  season?: string;
  bodyType?: string;
  colorSeason?: string;
  temperature?: number;
  userId?: string;
  sessionId?: string;
  knowledgeContext?: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  userPreferences?: Record<string, any>;
}

export interface HallucinationLog {
  id: string;
  response: string;
  detection: { isHallucination?: boolean; confidenceScore: number; issues: DetectedIssue[] };
  context: ValidationContext;
  timestamp: Date;
  resolved: boolean;
  resolution?: string;
}

@Injectable()
export class AISafetyService {
  private readonly logger = new Logger(AISafetyService.name);
  private readonly mlServiceUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @InjectMetric('hallucination_detection_total')
    private readonly detectionCounter: Counter<string>,
    @InjectMetric('hallucination_rate')
    private readonly hallucinationRate: Gauge<string>,
    @InjectMetric('validation_latency_seconds')
    private readonly validationLatency: Histogram<string>,
  ) {
    this.mlServiceUrl = this.configService.get<string>(
      'ML_SERVICE_URL',
      'http://localhost:8001'
    );
  }

  /**
   * Validate LLM response for hallucinations
   *
   * @param response - LLM generated response text
   * @param context - Validation context (occasion, season, body_type, etc.)
   * @returns ValidationResult with confidence score and detected issues
   */
  async validateResponse(
    response: string,
    context: ValidationContext = {},
  ): Promise<ValidationResult> {
    const startTime = Date.now();

    try {
      // Call Python ML service for detection
      const detectionResult = await this.callMLService(response, context);

      // Record metrics
      this.recordMetrics(detectionResult, context);

      // Log if hallucination detected
      if (detectionResult.isHallucination || detectionResult.confidenceScore < 0.7) {
        await this.logHallucination(response, detectionResult, context);
      }

      const processingTime = Date.now() - startTime;

      // Record latency
      this.validationLatency.observe(processingTime / 1000);

      return {
        isValid: !detectionResult.isHallucination && detectionResult.confidenceScore >= 0.5,
        confidenceScore: detectionResult.confidenceScore,
        issues: detectionResult.issues,
        processingTimeMs: processingTime,
        validatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Validation failed: ${this.getErrorMessage(error)}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Return a conservative result on error
      return {
        isValid: false,
        confidenceScore: 0,
        issues: [
          {
            type: 'validation_error',
            severity: 'error',
            description: 'Failed to validate response',
            confidence: 1.0,
            details: { error: this.getErrorMessage(error) },
          },
        ],
        processingTimeMs: Date.now() - startTime,
        validatedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Validate and correct response if possible
   *
   * @param response - Original response
   * @param context - Validation context
   * @returns Corrected response and validation result
   */
  async validateAndCorrect(
    response: string,
    context: ValidationContext = {},
  ): Promise<{ correctedResponse: string; validation: ValidationResult }> {
    const validation = await this.validateResponse(response, context);

    let correctedResponse = response;

    // If hallucination detected, add disclaimer
    if (!validation.isValid) {
      const criticalIssues = validation.issues.filter(
        (i) => i.severity === 'error'
      );

      if (criticalIssues.length > 0) {
        // Add warning prefix for critical issues
        correctedResponse = this.addWarningPrefix(response, criticalIssues);
      }
    }

    return {
      correctedResponse,
      validation,
    };
  }

  /**
   * Log hallucination detection for analysis
   *
   * @param response - The response with hallucination
   * @param detection - Detection result (partial ValidationResult)
   */
  async logHallucination(
    response: string,
    detection: { isHallucination?: boolean; confidenceScore: number; issues: DetectedIssue[] },
    context: ValidationContext = {},
  ): Promise<void> {
    const logEntry: HallucinationLog = {
      id: this.generateLogId(),
      response: response.substring(0, 500), // Truncate for storage
      detection,
      context,
      timestamp: new Date(),
      resolved: false,
    };

    // Log to console for now (could be extended to database)
    this.logger.warn({
      message: 'Hallucination detected',
      logId: logEntry.id,
      confidenceScore: detection.confidenceScore,
      issueCount: detection.issues.length,
      criticalIssues: detection.issues.filter((i) => i.severity === 'error').length,
      context: {
        occasion: context.occasion,
        season: context.season,
        bodyType: context.bodyType,
      },
    });

    // In production, this would be stored in a database for analysis
    // await this.hallucinationLogRepository.save(logEntry);
  }

  /**
   * Get hallucination statistics
   */
  async getStatistics(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalDetections: number;
    hallucinationRate: number;
    averageConfidence: number;
    issuesByType: Record<string, number>;
    issuesBySeverity: Record<string, number>;
  }> {
    // In production, this would query the database
    // For now, return placeholder data
    return {
      totalDetections: 0,
      hallucinationRate: 0,
      averageConfidence: 1.0,
      issuesByType: {},
      issuesBySeverity: {},
    };
  }

  /**
   * Quick validation check (lightweight, for real-time use)
   */
  async quickCheck(response: string): Promise<boolean> {
    try {
      // Simple checks without full ML service call
      const suspiciousPatterns = [
        /绝对|一定|必须|always|never|must/gi,
        /\d{4}年|year \d{4}/g, // Future dates
        /\$\d{6,}/g, // Unusually high prices
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(response)) {
          return false;
        }
      }

      return true;
    } catch (error) {
      // Log unexpected error but default to true to avoid blocking responses
      this.logger.warn(
        `quickCheck encountered unexpected error: ${this.getErrorMessage(error)}. Defaulting to true.`,
      );
      return true;
    }
  }

  /**
   * Call Python ML service for hallucination detection
   */
  private async callMLService(
    textToValidate: string,
    context: ValidationContext,
  ): Promise<{
    isHallucination: boolean;
    confidenceScore: number;
    issues: DetectedIssue[];
  }> {
    try {
      const response = await firstValueFrom(
        this.httpService.post<{
          is_hallucination?: boolean;
          confidence_score?: number;
          issues?: Array<{ type: string; severity: string; description: string }>;
        }>(
          `${this.mlServiceUrl}/api/v1/hallucination/detect`,
          {
            text: textToValidate,
            context: {
              occasion: context.occasion,
              season: context.season,
              body_type: context.bodyType,
              color_season: context.colorSeason,
              temperature: context.temperature,
            },
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 5000,
          },
        ),
      );

      const data = response.data;

      return {
        isHallucination: data.is_hallucination ?? false,
        confidenceScore: data.confidence_score ?? 1.0,
        issues: (data.issues ?? []).map((issue: { type: string; severity: string; description: string; confidence?: number; location?: string; suggestion?: string; details?: Record<string, unknown> }) => ({
          type: issue.type,
          severity: issue.severity as 'error' | 'warning' | 'info',
          description: issue.description,
          confidence: issue.confidence ?? 0.5,
          location: issue.location,
          suggestion: issue.suggestion,
          details: issue.details,
        })),
      };
    } catch (error) {
      // If ML service is unavailable, use fallback validation
      this.logger.warn(
        `ML service unavailable, using fallback: ${this.getErrorMessage(error)}`,
      );
      return this.fallbackValidation(textToValidate, context);
    }
  }

  /**
   * Fallback validation when ML service is unavailable
   */
  private fallbackValidation(
    response: string,
    context: ValidationContext,
  ): {
    isHallucination: boolean;
    confidenceScore: number;
    issues: DetectedIssue[];
  } {
    const issues: DetectedIssue[] = [];

    // Temperature consistency check
    if (context.temperature !== undefined) {
      const tempMatch = response.match(/(-?\d+)\s*[°度]C?/i);
      const mentionedTempText = tempMatch?.[1];
      if (mentionedTempText) {
        const mentionedTemp = parseInt(mentionedTempText, 10);
        if (Math.abs(mentionedTemp - context.temperature) > 15) {
          issues.push({
            type: 'numerical_error',
            severity: 'warning',
            description: `Temperature ${mentionedTemp}C differs significantly from actual ${context.temperature}C`,
            confidence: 0.8,
          });
        }
      }
    }

    // Occasion appropriateness check
    if (context.occasion) {
      const forbiddenPatterns: Record<string, RegExp[]> = {
        business: [/短裤|sandals|flip.?flops/i],
        formal: [/jeans|sneakers|t-?shirt/i],
        interview: [/casual|jeans|sneakers/i],
      };

      const patterns = forbiddenPatterns[context.occasion.toLowerCase()];
      if (patterns) {
        for (const pattern of patterns) {
          if (pattern.test(response)) {
            issues.push({
              type: 'fashion_rule',
              severity: 'warning',
              description: `Item may not be appropriate for ${context.occasion} occasion`,
              confidence: 0.7,
            });
          }
        }
      }
    }

    const confidenceScore = issues.length > 0
      ? Math.max(0.3, 1 - issues.length * 0.2)
      : 0.8; // Lower confidence for fallback

    return {
      isHallucination: confidenceScore < 0.5,
      confidenceScore,
      issues,
    };
  }

  /**
   * Record metrics for monitoring
   */
  private recordMetrics(
    result: { isHallucination: boolean; confidenceScore: number; issues: DetectedIssue[] },
    context: ValidationContext,
  ): void {
    // Increment detection counter
    this.detectionCounter.inc({
      status: result.isHallucination ? 'hallucination' : 'valid',
      occasion: context.occasion || 'unknown',
    });

    // Update hallucination rate gauge
    this.hallucinationRate.set(
      { occasion: context.occasion || 'all' },
      result.isHallucination ? 1 : 0,
    );
  }

  /**
   * Add warning prefix to response with critical issues
   */
  private addWarningPrefix(
    response: string,
    issues: DetectedIssue[],
  ): string {
    const warningPrefix = '[提示：该建议可能包含不准确信息，请谨慎参考]\n\n';
    return warningPrefix + response;
  }

  /**
   * Generate unique log ID
   */
  private generateLogId(): string {
    return `hallucination_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown error';
  }
}
