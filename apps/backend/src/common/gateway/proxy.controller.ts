import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  Post,
  Request,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthGuard } from "@nestjs/passport";
import { Throttle } from "@nestjs/throttler";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { AuthenticatedRequest } from "../types/auth.types";

class ProxyStylistRequestDto {
  message!: string;
  sessionId?: string;
  context?: Record<string, unknown>;
}

class ProxyTryonRequestDto {
  garmentImageUrl!: string;
  userImageUrl!: string;
  category?: string;
}

/**
 * Server-side proxy for AI service requests.
 *
 * Mobile clients no longer hold API keys directly. Instead, they call
 * these proxy endpoints which inject server-side credentials before
 * forwarding to the AI services. This prevents key leakage in client bundles.
 */
@ApiTags("Proxy")
@Controller("api/v1/proxy")
export class ProxyController {
  private readonly logger = new Logger(ProxyController.name);
  private readonly aiServiceUrl: string;
  private readonly falApiKey: string | null;
  private readonly openaiApiKey: string | null;

  constructor(private readonly configService: ConfigService) {
    this.aiServiceUrl =
      this.configService.get<string>("AI_SERVICE_URL") || "http://ai-service:8002";

    // Read API keys from Docker Secrets file paths first, fallback to env vars
    this.falApiKey = this.readSecret("FAL_KEY_FILE", "FAL_KEY");
    this.openaiApiKey = this.readSecret("OPENAI_KEY_FILE", "OPENAI_KEY");
  }

  /**
   * Read a secret value from a Docker Secrets file path, falling back to
   * an environment variable. This supports the _FILE convention used by
   * Docker Compose secrets.
   */
  private readSecret(fileEnvKey: string, fallbackEnvKey: string): string | null {
    // Try Docker Secret file path first
    const filePath = this.configService.get<string>(fileEnvKey);
    if (filePath) {
      try {
        const fs = require("fs");
        const value = fs.readFileSync(filePath, "utf-8").trim();
        if (value) {
          this.logger.log(`Loaded secret from ${fileEnvKey} (${filePath})`);
          return value;
        }
      } catch {
        this.logger.warn(`Failed to read secret file for ${fileEnvKey}: ${filePath}`);
      }
    }

    // Fallback to environment variable
    const envValue = this.configService.get<string>(fallbackEnvKey);
    if (envValue) {
      this.logger.log(`Loaded secret from env var ${fallbackEnvKey}`);
      return envValue;
    }

    this.logger.warn(`No secret found for ${fileEnvKey} or ${fallbackEnvKey}`);
    return null;
  }

  /**
   * POST /api/v1/proxy/ai/stylist
   * Proxy stylist AI requests from mobile clients.
   * Rate limited to 10 requests per minute per user.
   */
  @Post("ai/stylist")
  @UseGuards(AuthGuard("jwt"))
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: "Proxy AI stylist requests (server-side key injection)" })
  async proxyStylist(@Request() req: AuthenticatedRequest, @Body() body: ProxyStylistRequestDto) {
    return this.forwardToAiService("/stylist/chat", body, req.user?.id);
  }

  /**
   * POST /api/v1/proxy/ai/tryon
   * Proxy virtual try-on requests from mobile clients.
   * Rate limited to 10 requests per minute per user.
   */
  @Post("ai/tryon")
  @UseGuards(AuthGuard("jwt"))
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: "Proxy AI try-on requests (server-side key injection)" })
  async proxyTryon(@Request() req: AuthenticatedRequest, @Body() body: ProxyTryonRequestDto) {
    return this.forwardToAiService("/tryon/generate", body, req.user?.id);
  }

  /**
   * Forward a request to the internal AI service with proper authentication.
   * Only whitelisted endpoints are allowed.
   */
  private async forwardToAiService(endpoint: string, body: unknown, userId?: string) {
    // Whitelist validation - only allow known AI service endpoints
    const allowedEndpoints = ["/stylist/chat", "/tryon/generate"];
    if (!allowedEndpoints.includes(endpoint)) {
      this.logger.warn(`Blocked proxy request to non-whitelisted endpoint: ${endpoint}`);
      throw new HttpException("Endpoint not allowed", HttpStatus.FORBIDDEN);
    }

    const targetUrl = `${this.aiServiceUrl}${endpoint}`;
    this.logger.log(`Proxying request to ${targetUrl} for user ${userId || "anonymous"}`);

    try {
      // Build headers with server-side API keys
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Forwarded-User-Id": userId || "",
      };

      if (this.falApiKey) {
        headers["X-FAL-Key"] = this.falApiKey;
      }
      if (this.openaiApiKey) {
        headers["X-OpenAI-Key"] = this.openaiApiKey;
      }

      const response = await fetch(targetUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120_000), // 2 minute timeout for AI inference
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        this.logger.error(`AI service returned ${response.status}: ${errorText}`);
        throw new HttpException(
          {
            statusCode: response.status,
            message: "AI service request failed",
            error: response.statusText,
          },
          response.status as HttpStatus
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Failed to reach AI service at ${targetUrl}: ${error}`);
      throw new HttpException("AI service temporarily unavailable", HttpStatus.SERVICE_UNAVAILABLE);
    }
  }
}
