import { Module } from '@nestjs/common';
import { AvatarTemplateController } from './avatar-template.controller';
import { AvatarTemplateService } from './avatar-template.service';

@Module({
  controllers: [AvatarTemplateController],
  providers: [AvatarTemplateService],
  exports: [AvatarTemplateService],
})
export class AvatarTemplateModule {}
