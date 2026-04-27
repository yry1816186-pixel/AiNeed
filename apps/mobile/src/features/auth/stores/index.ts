/**
 * Auth stores barrel export.
 *
 * Canonical implementation lives in authStore.ts.
 * All external imports MUST go through this barrel.
 */
export { useAuthStore } from "./authStore";
export type { AuthState, StyleProfile } from "./authStore";
