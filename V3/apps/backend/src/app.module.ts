import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validate } from './config/env';
import { PrismaModule } from './prisma/prisma.module';
import { UploadModule } from './modules/upload/upload.module';
import { ClothingModule } from './modules/clothing/clothing.module';
import { EmbeddingModule } from './modules/embedding/embedding.module';
import { StylistModule } from './modules/stylist/stylist.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { NotificationModule } from './modules/notification/notification.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    UploadModule,
    ClothingModule,
    EmbeddingModule,
    StylistModule,
    KnowledgeModule,
    NotificationModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
