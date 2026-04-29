export interface PartnerApiRequest {
  keyPrefix: string;
  timestamp: number;
  signature: string;
  body: string;
  method: string;
  path: string;
  ip?: string;
}

export interface PartnerApiKeyData {
  id: string;
  name: string;
  keyPrefix: string;
  rateLimit: number;
  status: string;
  permissions: unknown;
  expiresAt: Date | null;
}

export const PARTNER_API_HEADERS = {
  API_KEY: "X-Api-Key",
  TIMESTAMP: "X-Timestamp",
  SIGNATURE: "X-Signature",
} as const;
