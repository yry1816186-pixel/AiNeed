import { AxiosError } from "axios";
import type { ApiError } from "../../types";

export enum AppErrorCode {
  NETWORK_ERROR = "NETWORK_ERROR",
  TIMEOUT_ERROR = "TIMEOUT_ERROR",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  NOT_FOUND = "NOT_FOUND",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  RATE_LIMITED = "RATE_LIMITED",
  SERVER_ERROR = "SERVER_ERROR",
  BUSINESS_ERROR = "BUSINESS_ERROR",
  TOKEN_EXPIRED = "TOKEN_EXPIRED",
  TOKEN_REFRESH_FAILED = "TOKEN_REFRESH_FAILED",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

const ERROR_MESSAGES_ZH: Record<AppErrorCode, string> = {
  [AppErrorCode.NETWORK_ERROR]: "网络连接失败，请检查网络设置",
  [AppErrorCode.TIMEOUT_ERROR]: "请求超时，请稍后重试",
  [AppErrorCode.UNAUTHORIZED]: "登录已过期，请重新登录",
  [AppErrorCode.FORBIDDEN]: "没有权限执行此操作",
  [AppErrorCode.NOT_FOUND]: "请求的资源不存在",
  [AppErrorCode.VALIDATION_ERROR]: "提交的数据有误，请检查后重试",
  [AppErrorCode.RATE_LIMITED]: "操作过于频繁，请稍后再试",
  [AppErrorCode.SERVER_ERROR]: "服务器开小差了，请稍后重试",
  [AppErrorCode.BUSINESS_ERROR]: "操作失败，请重试",
  [AppErrorCode.TOKEN_EXPIRED]: "登录已过期，请重新登录",
  [AppErrorCode.TOKEN_REFRESH_FAILED]: "登录状态失效，请重新登录",
  [AppErrorCode.UNKNOWN_ERROR]: "发生未知错误，请重试",
};

export class AppError extends Error {
  code: AppErrorCode;
  statusCode?: number;
  details?: Record<string, unknown>;
  originalError?: unknown;

  constructor(
    code: AppErrorCode,
    message?: string,
    options?: {
      statusCode?: number;
      details?: Record<string, unknown>;
      originalError?: unknown;
    }
  ) {
    super(message || ERROR_MESSAGES_ZH[code]);
    this.name = "AppError";
    this.code = code;
    this.statusCode = options?.statusCode;
    this.details = options?.details;
    this.originalError = options?.originalError;
  }

  get isNetworkError(): boolean {
    return this.code === AppErrorCode.NETWORK_ERROR;
  }

  get isAuthError(): boolean {
    return (
      this.code === AppErrorCode.UNAUTHORIZED ||
      this.code === AppErrorCode.TOKEN_EXPIRED ||
      this.code === AppErrorCode.TOKEN_REFRESH_FAILED
    );
  }

  get isRetryable(): boolean {
    return (
      this.code === AppErrorCode.NETWORK_ERROR ||
      this.code === AppErrorCode.TIMEOUT_ERROR ||
      this.code === AppErrorCode.SERVER_ERROR ||
      this.code === AppErrorCode.RATE_LIMITED
    );
  }

  get userMessage(): string {
    return this.message || ERROR_MESSAGES_ZH[this.code];
  }
}

export function classifyAxiosError(error: AxiosError<ApiError>): AppError {
  if (!error.response) {
    if (error.code === "ECONNABORTED" || error.code === "ERR_CANCELED") {
      return new AppError(AppErrorCode.TIMEOUT_ERROR, undefined, {
        originalError: error,
      });
    }
    return new AppError(AppErrorCode.NETWORK_ERROR, undefined, {
      originalError: error,
    });
  }

  const { status, data } = error.response;
  const apiMessage = data?.message;
  const apiDetails = data?.details;

  switch (status) {
    case 401:
      return new AppError(AppErrorCode.UNAUTHORIZED, apiMessage, {
        statusCode: status,
        details: apiDetails,
        originalError: error,
      });
    case 403:
      return new AppError(AppErrorCode.FORBIDDEN, apiMessage, {
        statusCode: status,
        details: apiDetails,
        originalError: error,
      });
    case 404:
      return new AppError(AppErrorCode.NOT_FOUND, apiMessage, {
        statusCode: status,
        details: apiDetails,
        originalError: error,
      });
    case 422:
      return new AppError(AppErrorCode.VALIDATION_ERROR, apiMessage, {
        statusCode: status,
        details: apiDetails,
        originalError: error,
      });
    case 429:
      return new AppError(AppErrorCode.RATE_LIMITED, apiMessage, {
        statusCode: status,
        details: apiDetails,
        originalError: error,
      });
    default:
      if (status >= 500) {
        return new AppError(AppErrorCode.SERVER_ERROR, apiMessage, {
          statusCode: status,
          details: apiDetails,
          originalError: error,
        });
      }
      return new AppError(AppErrorCode.BUSINESS_ERROR, apiMessage, {
        statusCode: status,
        details: apiDetails,
        originalError: error,
      });
  }
}

export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof AxiosError) {
    return classifyAxiosError(error as AxiosError<ApiError>);
  }

  if (error instanceof Error) {
    return new AppError(AppErrorCode.UNKNOWN_ERROR, error.message, {
      originalError: error,
    });
  }

  return new AppError(AppErrorCode.UNKNOWN_ERROR, String(error), {
    originalError: error,
  });
}

export function getErrorMessage(error: unknown): string {
  return toAppError(error).userMessage;
}
