import { Module, Global } from "@nestjs/common";

import { EncryptionService } from "./encryption.service";
import { PIIEncryptionService } from "./pii-encryption.service";

@Global()
@Module({
  providers: [EncryptionService, PIIEncryptionService],
  exports: [EncryptionService, PIIEncryptionService],
})
export class EncryptionModule {}
