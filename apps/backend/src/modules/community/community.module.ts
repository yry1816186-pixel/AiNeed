import { Module } from "@nestjs/common";

import { PrismaModule } from "../../common/prisma/prisma.module";
import { StorageModule } from "../../common/storage/storage.module";

import { CommunityController } from "./community.controller";
import { CommunityService } from "./community.service";

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [CommunityController],
  providers: [CommunityService],
  exports: [CommunityService],
})
export class CommunityModule {}
