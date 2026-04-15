import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { ContentFilterService } from "./content-filter/content-filter.service";
import { AiCircuitBreakerService } from "./degradation/ai-circuit-breaker.service";
import { SecurityPIIEncryptionService } from "./encryption/pii-encryption.service";
import { PrismaEncryptionMiddleware } from "./encryption/prisma-encryption-middleware.service";
import { AiQuotaGuard } from "./rate-limit/ai-quota.guard";
import { AiQuotaService } from "./rate-limit/ai-quota.service";
import { VaultService } from "./vault/vault.service";

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    VaultService,
    SecurityPIIEncryptionService,
    PrismaEncryptionMiddleware,
    ContentFilterService,
    AiQuotaService,
    AiQuotaGuard,
    AiCircuitBreakerService,
  ],
  exports: [
    VaultService,
    SecurityPIIEncryptionService,
    ContentFilterService,
    AiQuotaService,
    AiQuotaGuard,
    AiCircuitBreakerService,
  ],
})
export class SecurityModule {}
