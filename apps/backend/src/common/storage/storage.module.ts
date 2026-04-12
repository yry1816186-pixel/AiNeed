import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { UserKeyService } from "../security/user-key.service";
import { PrismaService } from "../prisma/prisma.service";

import { StorageController } from "./storage.controller";
import { StorageService } from "./storage.service";

@Global()
@Module({
  controllers: [StorageController],
  providers: [StorageService, UserKeyService, PrismaService],
  exports: [StorageService, UserKeyService],
})
export class StorageModule {}
