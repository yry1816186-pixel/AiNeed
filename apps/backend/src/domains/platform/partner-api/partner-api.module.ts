import { Module } from "@nestjs/common";

import { PrismaModule } from "../../../common/prisma/prisma.module";
import { PartnerApiKeyGuard } from "./guards/partner-api-key.guard";
import { PartnerAuthGuard } from "./guards/partner-auth.guard";

@Module({
  imports: [PrismaModule],
  providers: [PartnerApiKeyGuard, PartnerAuthGuard],
  exports: [PartnerApiKeyGuard, PartnerAuthGuard],
})
export class PartnerApiModule {}
