import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      datasourceUrl: process.env.DATABASE_URL,
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Prisma connected to database');

      (this as Record<string, unknown>).$on('error', (event: unknown) => {
        this.logger.error('Prisma error', String(event));
      });

      (this as Record<string, unknown>).$on('warn', (event: unknown) => {
        this.logger.warn('Prisma warning', String(event));
      });
    } catch (error) {
      this.logger.error('Failed to connect to database', String(error));
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.$disconnect();
      this.logger.log('Prisma disconnected from database');
    } catch (error) {
      this.logger.error('Error disconnecting from database', String(error));
    }
  }
}
