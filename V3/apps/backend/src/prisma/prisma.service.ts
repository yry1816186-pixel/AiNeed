import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    super({
      adapter,
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

      (this as unknown as { $on: (event: 'error', callback: (e: Prisma.LogEvent) => void) => void }).$on('error', (event: Prisma.LogEvent) => {
        this.logger.error('Prisma error', String(event.message));
      });

      (this as unknown as { $on: (event: 'warn', callback: (e: Prisma.LogEvent) => void) => void }).$on('warn', (event: Prisma.LogEvent) => {
        this.logger.warn('Prisma warning', String(event.message));
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
