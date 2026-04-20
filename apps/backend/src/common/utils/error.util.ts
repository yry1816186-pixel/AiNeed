/**
 * @fileoverview 错误消息提取工具函数
 *
 * 消除项目中 186 处重复的错误消息提取模式：
 *   error instanceof Error ? error.message : String(error)
 *
 * @module common/utils/error
 */

/**
 * 从未知类型的错误中安全提取消息字符串
 *
 * 在 catch 块中，error 的类型为 unknown，需要安全地提取可读消息。
 * 此函数统一处理 Error 实例和非 Error 值（字符串、数字、对象等）。
 *
 * @param error - 未知类型的错误值
 * @returns 错误消息字符串
 *
 * @example
 * ```typescript
 * try {
 *   await riskyOperation();
 * } catch (error: unknown) {
 *   // 之前: this.logger.error(`Failed: ${error instanceof Error ? error.message : String(error)}`);
 *   // 现在:
 *   this.logger.error(`Failed: ${getErrorMessage(error)}`);
 * }
 * ```
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return String(error);
}
