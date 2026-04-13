import { Module } from "@nestjs/common";

import { PrismaModule } from "../../common/prisma/prisma.module";

import { ShareTemplateController } from "./share-template.controller";
import { ShareTemplateService } from "./share-template.service";

@Module({
  imports: [PrismaModule],
  controllers: [ShareTemplateController],
  providers: [ShareTemplateService],
  exports: [ShareTemplateService],
})
export class ShareTemplateModule {}
