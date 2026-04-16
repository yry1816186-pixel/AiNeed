/* eslint-disable @typescript-eslint/no-explicit-any */
import { Injectable, Logger } from "@nestjs/common";

import {
  NOTIFICATION_TEMPLATES,
  getTemplatesByCategory,
  type NotificationCategory,
  type NotificationPriority,
  type NotificationTemplate,
} from "../templates/notification-templates";

/**
 * Rendered notification content
 */
export interface RenderedNotification {
  title: string;
  body: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  actionUrl?: string;
}

/**
 * Service for rendering notification templates with variable interpolation.
 * Templates use {variableName} placeholders that are replaced with actual values.
 */
@Injectable()
export class NotificationTemplateService {
  private readonly logger = new Logger(NotificationTemplateService.name);

  /**
   * Get a template definition by key.
   */
  getTemplate(key: string): NotificationTemplate | undefined {
    return NOTIFICATION_TEMPLATES[key];
  }

  /**
   * Render a notification template with the given variables.
   *
   * @param key - Template key (e.g., "order_payment_success")
   * @param variables - Key-value pairs to substitute in the template
   * @returns Rendered notification content, or undefined if template not found
   */
  render(
    key: string,
    variables: Record<string, string> = {},
  ): RenderedNotification | undefined {
    const template = NOTIFICATION_TEMPLATES[key];
    if (!template) {
      this.logger.warn(`Notification template not found: ${key}`);
      return undefined;
    }

    const title = this.interpolate(template.titleTemplate, variables);
    const body = this.interpolate(template.bodyTemplate, variables);
    const actionUrl = template.defaultActionUrl
      ? this.interpolate(template.defaultActionUrl, variables)
      : undefined;

    return {
      title,
      body,
      category: template.category,
      priority: template.priority,
      actionUrl,
    };
  }

  /**
   * Render a template, throwing an error if not found.
   */
  renderOrThrow(
    key: string,
    variables: Record<string, string> = {},
  ): RenderedNotification {
    const result = this.render(key, variables);
    if (!result) {
      throw new Error(`Notification template not found: ${key}`);
    }
    return result;
  }

  /**
   * Get all templates for a given category.
   */
  getTemplatesByCategory(category: NotificationCategory): NotificationTemplate[] {
    return getTemplatesByCategory(category);
  }

  /**
   * Get all available template keys.
   */
  getAllKeys(): string[] {
    return Object.keys(NOTIFICATION_TEMPLATES);
  }

  /**
   * Check if a template exists.
   */
  hasTemplate(key: string): boolean {
    return key in NOTIFICATION_TEMPLATES;
  }

  /**
   * Interpolate variables into a template string.
   * Replaces {variableName} with the corresponding value.
   * Missing variables are left as-is (not removed).
   */
  private interpolate(template: string, variables: Record<string, string>): string {
    return template.replace(/\{(\w+)\}/g, (match: string, varName: string): string => {
      if (varName in variables && variables[varName] !== undefined) {
        return variables[varName];
      }
      this.logger.debug(
        `Template variable {${varName}} not provided, leaving placeholder`,
      );
      return match;
    });
  }
}
