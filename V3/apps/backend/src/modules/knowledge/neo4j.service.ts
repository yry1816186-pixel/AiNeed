import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import neo4j, { Driver, Session, Result } from 'neo4j-driver';

@Injectable()
export class Neo4jService implements OnModuleInit, OnModuleDestroy {
  private driver: Driver | null = null;
  private readonly logger = new Logger(Neo4jService.name);

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.configService.get<string>('NEO4J_URL') || 'bolt://localhost:7687';
    const user = this.configService.get<string>('NEO4J_USER') || 'neo4j';
    const password = this.configService.get<string>('NEO4J_PASSWORD') || 'password';

    try {
      this.driver = neo4j.driver(url, neo4j.auth.basic(user, password), {
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 30000,
        connectionTimeout: 15000,
      });

      await this.driver.verifyConnectivity();
      this.logger.log('Neo4j driver connected successfully');
    } catch (error) {
      this.logger.error(`Failed to connect to Neo4j: ${String(error)}`);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.driver) {
      try {
        await this.driver.close();
        this.logger.log('Neo4j driver closed');
      } catch (error) {
        this.logger.error(`Error closing Neo4j driver: ${String(error)}`);
      }
    }
  }

  getDriver(): Driver {
    if (!this.driver) {
      throw new Error('Neo4j driver not initialized');
    }
    return this.driver;
  }

  getReadSession(): Session {
    return this.getDriver().session({ accessMode: neo4j.session.READ });
  }

  getWriteSession(): Session {
    return this.getDriver().session({ accessMode: neo4j.session.WRITE });
  }

  async read(cypher: string, params: Record<string, unknown> = {}): Promise<Result> {
    const session = this.getReadSession();
    try {
      const result = await session.run(cypher, params);
      return result;
    } finally {
      await session.close();
    }
  }

  async write(cypher: string, params: Record<string, unknown> = {}): Promise<Result> {
    const session = this.getWriteSession();
    try {
      const result = await session.run(cypher, params);
      return result;
    } finally {
      await session.close();
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.read('RETURN 1 AS health');
      const records = result.records;
      return records.length > 0 && records[0].get('health').toNumber() === 1;
    } catch {
      return false;
    }
  }
}
