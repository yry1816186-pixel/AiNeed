/**
 * Tests for the API client error handling module
 * Tests pure functions from error.ts that have no React Native dependencies
 */

import { AxiosError } from "axios";
import type { ApiError } from "../../types/api";
import {
  AppError,
  AppErrorCode,
  classifyAxiosError,
  toAppError,
  getErrorMessage,
} from "../api/error";

describe("AppError", () => {
  it("should create error with default message from code", () => {
    const error = new AppError(AppErrorCode.NETWORK_ERROR);
    expect(error.message).toBe("网络连接失败，请检查网络设置");
    expect(error.code).toBe(AppErrorCode.NETWORK_ERROR);
    expect(error.name).toBe("AppError");
  });

  it("should create error with custom message", () => {
    const error = new AppError(AppErrorCode.BUSINESS_ERROR, "自定义错误消息");
    expect(error.message).toBe("自定义错误消息");
    expect(error.code).toBe(AppErrorCode.BUSINESS_ERROR);
  });

  it("should create error with options", () => {
    const error = new AppError(AppErrorCode.UNAUTHORIZED, undefined, {
      statusCode: 401,
      details: { reason: "token expired" },
    });
    expect(error.statusCode).toBe(401);
    expect(error.details).toEqual({ reason: "token expired" });
  });

  it("should identify network errors", () => {
    const error = new AppError(AppErrorCode.NETWORK_ERROR);
    expect(error.isNetworkError).toBe(true);
    expect(error.isAuthError).toBe(false);
  });

  it("should identify auth errors", () => {
    expect(new AppError(AppErrorCode.UNAUTHORIZED).isAuthError).toBe(true);
    expect(new AppError(AppErrorCode.TOKEN_EXPIRED).isAuthError).toBe(true);
    expect(new AppError(AppErrorCode.TOKEN_REFRESH_FAILED).isAuthError).toBe(true);
    expect(new AppError(AppErrorCode.NETWORK_ERROR).isAuthError).toBe(false);
  });

  it("should identify retryable errors", () => {
    expect(new AppError(AppErrorCode.NETWORK_ERROR).isRetryable).toBe(true);
    expect(new AppError(AppErrorCode.TIMEOUT_ERROR).isRetryable).toBe(true);
    expect(new AppError(AppErrorCode.SERVER_ERROR).isRetryable).toBe(true);
    expect(new AppError(AppErrorCode.RATE_LIMITED).isRetryable).toBe(true);
    expect(new AppError(AppErrorCode.UNAUTHORIZED).isRetryable).toBe(false);
  });

  it("should return user message", () => {
    const error = new AppError(AppErrorCode.NETWORK_ERROR);
    expect(error.userMessage).toBe("网络连接失败，请检查网络设置");
  });
});

describe("classifyAxiosError", () => {
  it("should classify network errors (no response)", () => {
    const axiosError = new AxiosError("Network Error");
    axiosError.code = "ERR_NETWORK";

    const result = classifyAxiosError(axiosError as AxiosError<ApiError>);
    expect(result.code).toBe(AppErrorCode.NETWORK_ERROR);
    expect(result.originalError).toBe(axiosError);
  });

  it("should classify timeout errors", () => {
    const axiosError = new AxiosError("Timeout");
    axiosError.code = "ECONNABORTED";

    const result = classifyAxiosError(axiosError as AxiosError<ApiError>);
    expect(result.code).toBe(AppErrorCode.TIMEOUT_ERROR);
  });

  it("should classify 401 as UNAUTHORIZED", () => {
    const axiosError = new AxiosError("Unauthorized", "ERR_BAD_REQUEST", undefined, undefined, {
      status: 401,
      data: { message: "Token expired" },
    } as any);

    const result = classifyAxiosError(axiosError as AxiosError<ApiError>);
    expect(result.code).toBe(AppErrorCode.UNAUTHORIZED);
    expect(result.statusCode).toBe(401);
  });

  it("should classify 403 as FORBIDDEN", () => {
    const axiosError = new AxiosError("Forbidden", "ERR_BAD_REQUEST", undefined, undefined, {
      status: 403,
      data: {},
    } as any);

    const result = classifyAxiosError(axiosError as AxiosError<ApiError>);
    expect(result.code).toBe(AppErrorCode.FORBIDDEN);
  });

  it("should classify 404 as NOT_FOUND", () => {
    const axiosError = new AxiosError("Not Found", "ERR_BAD_REQUEST", undefined, undefined, {
      status: 404,
      data: {},
    } as any);

    const result = classifyAxiosError(axiosError as AxiosError<ApiError>);
    expect(result.code).toBe(AppErrorCode.NOT_FOUND);
  });

  it("should classify 422 as VALIDATION_ERROR", () => {
    const axiosError = new AxiosError("Validation", "ERR_BAD_REQUEST", undefined, undefined, {
      status: 422,
      data: { message: "Invalid input" },
    } as any);

    const result = classifyAxiosError(axiosError as AxiosError<ApiError>);
    expect(result.code).toBe(AppErrorCode.VALIDATION_ERROR);
    expect(result.message).toBe("Invalid input");
  });

  it("should classify 429 as RATE_LIMITED", () => {
    const axiosError = new AxiosError(
      "Too Many Requests",
      "ERR_BAD_REQUEST",
      undefined,
      undefined,
      {
        status: 429,
        data: {},
      } as any
    );

    const result = classifyAxiosError(axiosError as AxiosError<ApiError>);
    expect(result.code).toBe(AppErrorCode.RATE_LIMITED);
  });

  it("should classify 500 as SERVER_ERROR", () => {
    const axiosError = new AxiosError(
      "Internal Server Error",
      "ERR_BAD_REQUEST",
      undefined,
      undefined,
      {
        status: 500,
        data: {},
      } as any
    );

    const result = classifyAxiosError(axiosError as AxiosError<ApiError>);
    expect(result.code).toBe(AppErrorCode.SERVER_ERROR);
  });

  it("should classify unknown status as BUSINESS_ERROR", () => {
    const axiosError = new AxiosError("Conflict", "ERR_BAD_REQUEST", undefined, undefined, {
      status: 409,
      data: { message: "Resource conflict" },
    } as any);

    const result = classifyAxiosError(axiosError as AxiosError<ApiError>);
    expect(result.code).toBe(AppErrorCode.BUSINESS_ERROR);
  });
});

describe("toAppError", () => {
  it("should return AppError as-is", () => {
    const original = new AppError(AppErrorCode.NETWORK_ERROR);
    expect(toAppError(original)).toBe(original);
  });

  it("should convert AxiosError to AppError", () => {
    const axiosError = new AxiosError("Network Error");
    const result = toAppError(axiosError);
    expect(result).toBeInstanceOf(AppError);
    expect(result.code).toBe(AppErrorCode.NETWORK_ERROR);
  });

  it("should convert generic Error to UNKNOWN_ERROR", () => {
    const error = new Error("Something went wrong");
    const result = toAppError(error);
    expect(result).toBeInstanceOf(AppError);
    expect(result.code).toBe(AppErrorCode.UNKNOWN_ERROR);
    expect(result.message).toBe("Something went wrong");
  });

  it("should convert non-Error to UNKNOWN_ERROR", () => {
    const result = toAppError("string error");
    expect(result.code).toBe(AppErrorCode.UNKNOWN_ERROR);
    expect(result.message).toBe("string error");
  });
});

describe("getErrorMessage", () => {
  it("should return user-friendly message for AppError", () => {
    const error = new AppError(AppErrorCode.NETWORK_ERROR);
    expect(getErrorMessage(error)).toBe("网络连接失败，请检查网络设置");
  });

  it("should return message for generic Error", () => {
    // toAppError passes error.message as the AppError message
    expect(getErrorMessage(new Error("test"))).toBe("test");
  });
});
