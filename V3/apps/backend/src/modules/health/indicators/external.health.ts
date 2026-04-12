import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';

interface ExternalApiCheckResult {
  provider: string;
  reachable: boolean;
  latencyMs: number;
  message?: string;
}

@Injectable()
export class ExternalHealthIndicator extends HealthIndicator {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const checks = await Promise.allSettled([
      this.checkZhipu(),
      this.checkDeepseek(),
    ]);

    const results: ExternalApiCheckResult[] = checks.map((check, index) => {
      const provider = index === 0 ? 'zhipu' : 'deepseek';
      if (check.status === 'fulfilled') {
        return check.value;
      }
      return {
        provider,
        reachable: false,
        latencyMs: 0,
        message: check.reason instanceof Error ? check.reason.message : 'Unknown error',
      };
    });

    const allReachable = results.every((r) => r.reachable);
    const details: Record<string, ExternalApiCheckResult> = {};
    for (const r of results) {
      details[r.provider] = r;
    }

    if (allReachable) {
      return this.getStatus(key, true, details);
    }

    const anyReachable = results.some((r) => r.reachable);
    if (anyReachable) {
      return this.getStatus(key, true, { ...details, degraded: true });
    }

    throw new HealthCheckError(
      'ExternalHealthCheck failed',
      this.getStatus(key, false, details),
    );
  }

  private async checkZhipu(): Promise<ExternalApiCheckResult> {
    const apiKey = this.configService.get<string>('ZHIPU_API_KEY');
    if (!apiKey || apiKey === 'your-zhipu-api-key') {
      return { provider: 'zhipu', reachable: false, latencyMs: 0, message: 'API key not configured' };
    }

    const start = Date.now();
    try {
      const response = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'glm-4-flash',
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 1,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      const latencyMs = Date.now() - start;
      return {
        provider: 'zhipu',
        reachable: response.ok || response.status === 429,
        latencyMs,
      };
    } catch (error) {
      return {
        provider: 'zhipu',
        reachable: false,
        latencyMs: Date.now() - start,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }

  private async checkDeepseek(): Promise<ExternalApiCheckResult> {
    const apiKey = this.configService.get<string>('DEEPSEEK_API_KEY');
    if (!apiKey || apiKey === 'your-deepseek-api-key') {
      return { provider: 'deepseek', reachable: false, latencyMs: 0, message: 'API key not configured' };
    }

    const start = Date.now();
    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 1,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      const latencyMs = Date.now() - start;
      return {
        provider: 'deepseek',
        reachable: response.ok || response.status === 429,
        latencyMs,
      };
    } catch (error) {
      return {
        provider: 'deepseek',
        reachable: false,
        latencyMs: Date.now() - start,
        message: error instanceof Error ? error.message : 'Connection failed',
      };
    }
  }
}
