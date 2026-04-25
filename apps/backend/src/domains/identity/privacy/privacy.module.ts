import { Module } from "@nestjs/common";

import { EmailModule } from "../../../common/email/email.module";
import { PrismaModule } from "../../../common/prisma/prisma.module";
import { StorageModule } from "../../../common/storage/storage.module";

import { ConsentController } from "./consent.controller";
import { ConsentGuard } from "./consent.guard";
import { PreferencesController } from "./preferences.controller";
import { PrivacyController } from "./privacy.controller";
import { PrivacyService } from "./privacy.service";

@Module({
  imports: [PrismaModule, StorageModule, EmailModule],
  controllers: [PrivacyController, ConsentController, PreferencesController],
  providers: [PrivacyService, ConsentGuard],
  exports: [PrivacyService, ConsentGuard],
})
export class PrivacyModule {}
