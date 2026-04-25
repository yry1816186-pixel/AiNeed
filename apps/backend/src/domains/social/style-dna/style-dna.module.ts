import { Module } from "@nestjs/common";

import { PrismaModule } from "../../../common/prisma/prisma.module";

import { StyleDnaController } from "./style-dna.controller";
import { StyleDnaService } from "./style-dna.service";

@Module({
  imports: [PrismaModule],
  controllers: [StyleDnaController],
  providers: [StyleDnaService],
  exports: [StyleDnaService],
})
export class StyleDnaModule {}
