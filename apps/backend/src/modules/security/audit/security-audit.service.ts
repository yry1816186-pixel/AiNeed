import { createHash } from "crypto";

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export type SecurityEventType =
  | "AUTH_LOGIN_FAILURE"
  | "AUTH_LOGIN_SUCCESS"
  | "AUTH_ACCOUNT_LOCKOUT"
  | "AUTH_TOKEN_REVOKED"
  | "AUTH_TOKEN_BLACKLIST_HIT"
  | "PAYMENT_CALLBACK_INVALID_SIGNATURE"
  | "PAYMENT_CALLBACK_REJECTED"
  | "ACCESS_DENIED"
  | "RATE_LIMIT_EXCEEDED"
  | "SSRF_BLOCKED"
  | "SUSPICIOUS_ACTIVITY";

export interface SecurityEvent {
  type: SecurityEventType;
  userId?: string;
  ip?: string;
  userAgent?: string;
  resource?: string;
  details?: Record<string, unknown>;
  timestamp?: Date;
}

@Injectable()
export class SecurityAuditService {
  private readonly logger = new Logger(SecurityAuditService.name);
  private readonly isProduction: boolean;

  constructor(private configService: ConfigService) {
    this.isProduction = this.configService.get("NODE_ENV") === "production";
  }

  log(event: SecurityEvent): void {
    const timestamp = event.timestamp ?? new Date();
    const maskedIp = event.ip ? this.maskIp(event.ip) : undefined;
    const maskedUserId = event.userId ? this.hashId(event.userId) : undefined;

    const logEntry = {
      _type: "SECURITY_EVENT",
      eventType: event.type,
      userId: maskedUserId,
      ip: maskedIp,
      resource: event.resource,
      details: this.isProduction ? this.sanitizeDetails(event.details) : event.details,
      timestamp: timestamp.toISOString(),
    };

    switch (event.type) {
      case "AUTH_ACCOUNT_LOCKOUT":
      case "PAYMENT_CALLBACK_INVALID_SIGNATURE":
      case "PAYMENT_CALLBACK_REJECTED":
      case "SSRF_BLOCKED":
      case "SUSPICIOUS_ACTIVITY":
        this.logger.error(JSON.stringify(logEntry));
        break;
      case "AUTH_LOGIN_FAILURE":
      case "AUTH_TOKEN_BLACKLIST_HIT":
      case "ACCESS_DENIED":
      case "RATE_LIMIT_EXCEEDED":
        this.logger.warn(JSON.stringify(logEntry));
        break;
      default:
        this.logger.log(JSON.stringify(logEntry));
    }
  }

  private maskIp(ip: string): string {
    const parts = ip.split(".");
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.*.*`;
    }
    if (ip.includes(":")) {
      const segments = ip.split(":");
      if (segments.length >= 4) {
        return `${segments.slice(0, 2).join(":")}::***`;
      }
    }
    return ip.slice(0, 4) + "***";
  }

  private hashId(id: string): string {
    return createHash("sha256").update(id).digest("hex").slice(0, 12);
  }

  private sanitizeDetails(details?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!details) {
      return undefined;
    }
    const sanitized: Record<string, unknown> = {};
    const sensitiveKeys = ["password", "token", "secret", "key", "code", "credential"];

    for (const [k, v] of Object.entries(details)) {
      if (sensitiveKeys.some((sk) => k.toLowerCase().includes(sk))) {
        sanitized[k] = "[REDACTED]";
      } else if (typeof v === "string" && v.length > 200) {
        sanitized[k] = v.slice(0, 50) + "...[TRUNCATED]";
      } else {
        sanitized[k] = v;
      }
    }
    return sanitized;
  }
}
