import { Module } from "@nestjs/common";

import { EmailModule } from "../../common/email/email.module";
import { PrismaModule } from "../../common/prisma/prisma.module";
import { StorageModule } from "../../common/storage/storage.module";

import { PrivacyController } from "./privacy.controller";
import { PrivacyService } from "./privacy.service";

@Module({
  imports: [PrismaModule, StorageModule, EmailModule],
  controllers: [PrivacyController],
  providers: [PrivacyService],
  exports: [PrivacyService],
})
export class PrivacyModule {}
