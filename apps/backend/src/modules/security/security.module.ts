import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { VaultService } from "./vault/vault.service";
import { SecurityPIIEncryptionService } from "./encryption/pii-encryption.service";
import { PrismaEncryptionMiddleware } from "./encryption/prisma-encryption-middleware.service";
import { ContentFilterService } from "./content-filter/content-filter.service";
import { AiQuotaService } from "./rate-limit/ai-quota.service";
import { AiQuotaGuard } from "./rate-limit/ai-quota.guard";
import { AiCircuitBreakerService } from "./degradation/ai-circuit-breaker.service";

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
