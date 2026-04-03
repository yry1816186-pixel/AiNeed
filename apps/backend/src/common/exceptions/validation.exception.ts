/**
 * @fileoverview 验证异常类
 *
 * 用于表示输入验证失败的场景，支持字段级别的错误详情。
 * 与 class-validator 集成，提供结构化的验证错误信息。
 *
 * @example
 * ```typescript
 * throw new ValidationException([
 *   { field: 'email', message: '邮箱格式不正确', value: 'invalid-email' },
 *   { field: 'password', message: '密码长度至少8位', value: '***' },
 * ]);
 * ```
 */

import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * 单个验证错误项
 */
export interface ValidationErrorItem {
  /** 字段名 */
  field: string;
  /** 错误消息 */
  message: string;
  /** 错误值（可选，生产环境会被隐藏） */
  value?: unknown;
  /** 约束名称（如 isEmail, minLength 等） */
  constraint?: string;
  /** 子字段错误（用于嵌套对象验证） */
  children?: ValidationErrorItem[];
}

/**
 * 验证异常选项
 */
export interface ValidationExceptionOptions {
  /** 错误消息（默认: 'Validation failed'） */
  message?: string;
  /** 错误码（默认: 42200） */
  code?: number;
  /** 是否在生产环境隐藏错误值 */
  hideValueInProduction?: boolean;
}

/**
 * 验证异常类
 *
 * @class ValidationException
 * @extends HttpException
 */
export class ValidationException extends HttpException {
  /**
   * 验证错误列表
   */
  readonly errors: ValidationErrorItem[];

  /**
   * 业务错误码
   */
  readonly code: number;

  /**
   * 构造函数
   *
   * @param errors 验证错误列表
   * @param options 选项
   */
  constructor(
    errors: ValidationErrorItem[],
    options: ValidationExceptionOptions = {},
  ) {
    const {
      message = 'Validation failed',
      code = 42200,
      hideValueInProduction = true,
    } = options;

    const isProduction = process.env.NODE_ENV === 'production';

    // 生产环境隐藏错误值
    const sanitizedErrors = isProduction && hideValueInProduction
      ? errors.map((e) => ({ ...e, value: undefined }))
      : errors;

    super(
      {
        message,
        code,
        errors: sanitizedErrors,
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );

    this.errors = sanitizedErrors;
    this.code = code;

    // 确保原型链正确
    Object.setPrototypeOf(this, ValidationException.prototype);
  }

  /**
   * 从 class-validator 错误创建验证异常
   *
   * @param validationErrors class-validator 错误数组
   */
  static fromClassValidator(
    validationErrors: Array<{
      property: string;
      constraints?: Record<string, string>;
      children?: unknown[];
      value?: unknown;
    }>,
  ): ValidationException {
    const errors: ValidationErrorItem[] = validationErrors.map((error) => ({
      field: error.property,
      message: error.constraints
        ? Object.values(error.constraints).join('; ')
        : 'Validation failed',
      value: error.value,
      constraint: error.constraints
        ? Object.keys(error.constraints).join(', ')
        : undefined,
    }));

    return new ValidationException(errors);
  }

  /**
   * 创建单个字段验证错误
   */
  static singleField(
    field: string,
    message: string,
    value?: unknown,
    constraint?: string,
  ): ValidationException {
    return new ValidationException([
      { field, message, value, constraint },
    ]);
  }

  /**
   * 创建必填字段缺失错误
   */
  static required(field: string): ValidationException {
    return ValidationException.singleField(
      field,
      `${field} 是必填字段`,
      undefined,
      'isRequired',
    );
  }

  /**
   * 创建格式错误
   */
  static invalidFormat(
    field: string,
    expectedFormat: string,
    value?: unknown,
  ): ValidationException {
    return ValidationException.singleField(
      field,
      `${field} 格式不正确，期望格式: ${expectedFormat}`,
      value,
      'format',
    );
  }

  /**
   * 创建值超出范围错误
   */
  static outOfRange(
    field: string,
    min: number | string,
    max: number | string,
    value?: unknown,
  ): ValidationException {
    return ValidationException.singleField(
      field,
      `${field} 必须在 ${min} 到 ${max} 之间`,
      value,
      'range',
    );
  }

  /**
   * 创建唯一性冲突错误
   */
  static duplicate(field: string, value?: unknown): ValidationException {
    return ValidationException.singleField(
      field,
      `${field} 已被使用`,
      value,
      'unique',
    );
  }
}
