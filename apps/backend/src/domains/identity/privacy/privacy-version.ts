/**
 * Current policy versions.
 * Update these when privacy policy or terms of service are modified.
 * Users will be prompted to re-consent when versions change.
 */

export const CURRENT_TERMS_VERSION = "1.0.0";
export const CURRENT_PRIVACY_VERSION = "1.0.0";
export const POLICY_UPDATED_AT = "2026-04-14";

/**
 * Policy version constant for consent tracking.
 */
export const POLICY_VERSIONS = {
  terms_of_service: CURRENT_TERMS_VERSION,
  privacy_policy: CURRENT_PRIVACY_VERSION,
} as const;

export type PolicyType = keyof typeof POLICY_VERSIONS;
