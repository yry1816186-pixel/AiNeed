import {
  PipeTransform,
  ArgumentMetadata,
  Injectable,
} from "@nestjs/common";

import { SanitizableValue } from "../types/common.types";

@Injectable()
export class XssSanitizationPipe implements PipeTransform {
  transform(value: SanitizableValue, metadata: ArgumentMetadata): SanitizableValue {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === "string") {
      return this.sanitizeHtml(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.transform(item, metadata));
    }

    if (typeof value === "object") {
      const result: Record<string, SanitizableValue> = {};
      for (const [key, val] of Object.entries(value)) {
        result[key] = this.transform(val, metadata);
      }
      return result;
    }

    return value;
  }

  private sanitizeHtml(input: string): string {
    return input
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;")
      .replace(/\\/g, "&#x5C;")
      .replace(/`/g, "&#x60;")
      .replace(/=/g, "&#x3D;");
  }
}
