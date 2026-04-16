import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

const SENSITIVE_PROFILE_FIELDS = [
  "shoulder",
  "bust",
  "waist",
  "hip",
  "inseam",
  "height",
  "weight",
] as const;

const SENSITIVE_NESTED_PREFIXES = ["analysisResult", "measurements"];

@Injectable()
export class SensitiveDataInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => this.sanitizeResponse(data)),
    );
  }

  private sanitizeResponse(data: unknown): unknown {
    if (!data || typeof data !== "object") {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeResponse(item));
    }

    const sanitized = { ...data as Record<string, unknown> };

    for (const field of SENSITIVE_PROFILE_FIELDS) {
      if (field in sanitized) {
        delete sanitized[field];
      }
    }

    for (const prefix of SENSITIVE_NESTED_PREFIXES) {
      if (prefix in sanitized && sanitized[prefix] !== null && sanitized[prefix] !== undefined) {
        delete sanitized[prefix];
      }
    }

    if (sanitized.profile && typeof sanitized.profile === "object") {
      sanitized.profile = this.sanitizeResponse(sanitized.profile);
    }

    if (sanitized.userProfile && typeof sanitized.userProfile === "object") {
      sanitized.userProfile = this.sanitizeResponse(sanitized.userProfile);
    }

    return sanitized;
  }
}
