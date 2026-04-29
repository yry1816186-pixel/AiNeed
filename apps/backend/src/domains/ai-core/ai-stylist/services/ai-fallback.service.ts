import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export class AiFallbackExhaustedException extends Error {
  public readonly primaryError: string;
  public readonly fallbackError: string;

  constructor(primaryError: string, fallbackError: string) {
    super(`AI fallback exhausted. GLM error: ${primaryError}. Qwen error: ${fallbackError}`);
    this.name = "AiFallbackExhaustedException";
    this.primaryError = primaryError;
    this.fallbackError = fallbackError;
  }
}

interface FallbackOptions {
  maxTokens?: number;
  temperature?: number;
  operation?: string;
  systemPrompt?: string;
}

@Injectable()
export class AiFallbackService {
  private readonly logger = new Logger(AiFallbackService.name);
  private readonly primaryTimeoutMs: number;
  private readonly fallbackTimeoutMs: number;
  private readonly glmApiKey: string;
  private readonly glmEndpoint: string;
  private readonly glmModel: string;
  private readonly qwenApiKey: string;
  private readonly qwenEndpoint: string;
  private readonly qwenModel: string;

  constructor(private readonly configService: ConfigService) {
    this.primaryTimeoutMs = parseInt(
      this.configService.get<string>("AI_PRIMARY_TIMEOUT_MS", "5000"),
      10
    );
    this.fallbackTimeoutMs = parseInt(
      this.configService.get<string>("AI_FALLBACK_TIMEOUT_MS", "5000"),
      10
    );

    const glmKey =
      this.configService.get<string>("GLM_API_KEY", "") ||
      this.configService.get<string>("ZHIPU_API_KEY", "");
    this.glmApiKey = glmKey;
    this.glmEndpoint = this.configService.get<string>(
      "GLM_API_ENDPOINT",
      "https://open.bigmodel.cn/api/paas/v4"
    );
    this.glmModel = this.configService.get<string>("GLM_MODEL", "glm-4-flash");

    this.qwenApiKey =
      this.configService.get<string>("DASHSCOPE_API_KEY", "") ||
      this.configService.get<string>("QWEN_API_KEY", "");
    this.qwenEndpoint = this.configService.get<string>(
      "QWEN_API_ENDPOINT",
      "https://dashscope.aliyuncs.com/compatible-mode/v1"
    );
    this.qwenModel = this.configService.get<string>("QWEN_MODEL", "qwen-plus");
  }

  async callWithFallback(userMessage: string, options: FallbackOptions = {}): Promise<string> {
    const operation = options.operation ?? "unknown";
    const messages: Array<{ role: string; content: string }> = [];

    if (options.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt });
    }
    messages.push({ role: "user", content: userMessage });

    const primaryError = await this.tryPrimary(messages, operation, options);
    if (primaryError === null) {
      return ""; // unreachable — tryPrimary throws or returns content
    }

    try {
      this.logger.log(`[FALLBACK] GLM->Qwen for ${operation}`);
      const content = await this.callQwen(messages, options);
      this.logger.log(`[FALLBACK_SUCCESS] Qwen responded for ${operation}`);
      return content;
    } catch (qwenError) {
      const fallbackMessage = qwenError instanceof Error ? qwenError.message : String(qwenError);
      this.logger.error(`[FALLBACK_EXHAUSTED] Both providers failed for ${operation}`);
      throw new AiFallbackExhaustedException(primaryError, fallbackMessage);
    }
  }

  private async tryPrimary(
    messages: Array<{ role: string; content: string }>,
    operation: string,
    options: FallbackOptions
  ): Promise<string | null> {
    try {
      if (!this.glmApiKey) {
        return "GLM API key not configured";
      }

      const content = await this.callGlm(messages, options);
      return content;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.warn(`[PRIMARY_FAILED] GLM error for ${operation}: ${errorMessage}`);
      return errorMessage;
    }
  }

  private async callGlm(
    messages: Array<{ role: string; content: string }>,
    options: FallbackOptions
  ): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.primaryTimeoutMs);

    try {
      const url = `${this.glmEndpoint}/chat/completions`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.glmApiKey}`,
        },
        body: JSON.stringify({
          model: this.glmModel,
          messages,
          max_tokens: options.maxTokens ?? 800,
          temperature: options.temperature ?? 0.3,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        if (response.status >= 500) {
          throw new Error(`GLM server error (${response.status}): ${errorText.slice(0, 200)}`);
        }
        throw new Error(`GLM API error (${response.status}): ${errorText.slice(0, 200)}`);
      }

      const data = (await response.json()) as {
        choices: Array<{ message: { content: string } }>;
      };

      const content = data.choices?.[0]?.message?.content?.trim() ?? "";
      if (!content) {
        throw new Error("GLM returned empty response");
      }

      return content;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`GLM request timeout after ${this.primaryTimeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async callQwen(
    messages: Array<{ role: string; content: string }>,
    options: FallbackOptions
  ): Promise<string> {
    if (!this.qwenApiKey) {
      throw new Error("Qwen API key not configured");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.fallbackTimeoutMs);

    try {
      const url = `${this.qwenEndpoint}/chat/completions`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.qwenApiKey}`,
        },
        body: JSON.stringify({
          model: this.qwenModel,
          messages,
          max_tokens: options.maxTokens ?? 800,
          temperature: options.temperature ?? 0.3,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(`Qwen API error (${response.status}): ${errorText.slice(0, 200)}`);
      }

      const data = (await response.json()) as {
        choices: Array<{ message: { content: string } }>;
      };

      const content = data.choices?.[0]?.message?.content?.trim() ?? "";
      if (!content) {
        throw new Error("Qwen returned empty response");
      }

      return content;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Qwen request timeout after ${this.fallbackTimeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
