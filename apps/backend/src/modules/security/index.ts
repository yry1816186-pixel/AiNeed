export { VaultService, type IVaultClient, type VaultSecret, type KeyRotationEvent } from "./vault/vault.service";

export {
  SecurityPIIEncryptionService,
  PII_FIELDS,
  type PIIModel,
} from "./encryption/pii-encryption.service";

export { createPrismaEncryptionMiddleware } from "./encryption/prisma-encryption.middleware";

export { ContentFilterService } from "./content-filter/content-filter.service";

export {
  AiQuotaService,
  type QuotaType,
} from "./rate-limit/ai-quota.service";

export {
  AiQuotaGuard,
  SetQuotaType,
  QUOTA_TYPE_KEY,
} from "./rate-limit/ai-quota.guard";

export {
  AiCircuitBreakerService,
  CircuitState,
  type CircuitHealth,
  CircuitBreakerOpenException,
} from "./degradation/ai-circuit-breaker.service";

export { SecurityModule } from "./security.module";
