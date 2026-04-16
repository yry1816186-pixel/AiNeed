/* eslint-disable @typescript-eslint/no-explicit-any */
import { Module } from "@nestjs/common";

import { EncryptionModule } from "../../../../common/encryption/encryption.module";
import { PrismaModule } from "../../../../common/prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { CacheModule } from "../../../modules/cache/cache.module";

import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  imports: [PrismaModule, EncryptionModule, AuthModule, CacheModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
