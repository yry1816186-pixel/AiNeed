import { Module } from '@nestjs/common';
import { CustomizationModule } from './customization/customization.module';
import { ShareTemplateModule } from './share-template/share-template.module';

@Module({
  imports: [CustomizationModule, ShareTemplateModule],
  exports: [CustomizationModule, ShareTemplateModule],
})
export class CustomizationDomainModule {}
