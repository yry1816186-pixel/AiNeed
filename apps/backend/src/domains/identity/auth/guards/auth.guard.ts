/**
 * Auth Guard
 * 重新导出 JwtAuthGuard 以保持向后兼容
 *
 * 注意：新代码应该直接使用 JwtAuthGuard
 */
export { JwtAuthGuard as AuthGuard } from "./jwt-auth.guard";
