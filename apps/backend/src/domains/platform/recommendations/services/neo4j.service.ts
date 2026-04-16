import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import neo4j, { Driver, Session, Result } from "neo4j-driver";

@Injectable()
export class Neo4jService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(Neo4jService.name);
  private driver: Driver | null = null;
  private isConnected = false;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const url = this.configService.get<string>("NEO4J_URL");
    const user = this.configService.get<string>("NEO4J_USER", "neo4j");
    const password = this.configService.get<string>("NEO4J_PASSWORD", "neo4j123");

    if (!url) {
      this.logger.warn("NEO4J_URL not configured, knowledge graph features disabled");
      return;
    }

    try {
      this.driver = neo4j.driver(url, neo4j.auth.basic(user, password), {
        maxConnectionLifetime: 3 * 60 * 60 * 1000,
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 30000,
      });

      await this.driver.verifyConnectivity();
      this.isConnected = true;
      this.logger.log(`Neo4j connected: ${url}`);

      await this.ensureConstraints();
    } catch (error) {
      this.logger.warn(`Neo4j connection failed, using fallback: ${error}`);
      this.isConnected = false;
    }
  }

  async onModuleDestroy() {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
      this.isConnected = false;
    }
  }

  private async ensureConstraints(): Promise<void> {
    if (!this.driver) {return;}

    const session = this.driver.session();
    try {
      await session.run(
        `CREATE CONSTRAINT item_id IF NOT EXISTS FOR (i:Item) REQUIRE i.id IS UNIQUE`,
      );
      await session.run(
        `CREATE CONSTRAINT category_name IF NOT EXISTS FOR (c:Category) REQUIRE c.name IS UNIQUE`,
      );
      await session.run(
        `CREATE CONSTRAINT style_name IF NOT EXISTS FOR (s:Style) REQUIRE s.name IS UNIQUE`,
      );
      await session.run(
        `CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE`,
      );
      this.logger.log("Neo4j constraints ensured");
    } catch (error) {
      this.logger.warn(`Constraint creation warning: ${error}`);
    } finally {
      await session.close();
    }
  }

  isReady(): boolean {
    return this.isConnected && this.driver !== null;
  }

  async runQuery(
    query: string,
    params: Record<string, unknown> = {},
  ): Promise<Result> {
    if (!this.driver) {
      throw new Error("Neo4j driver not initialized");
    }

    const session = this.driver.session();
    try {
      const result = await session.run(query, params);
      return result;
    } finally {
      await session.close();
    }
  }

  async runReadQuery<T>(
    query: string,
    params: Record<string, unknown> = {},
  ): Promise<T[]> {
    if (!this.driver) {
      throw new Error("Neo4j driver not initialized");
    }

    const session = this.driver.session();
    try {
      const result = await session.executeRead((tx) => tx.run(query, params));
      return result.records.map((record) => {
        const obj: Record<string, unknown> = {};
        record.keys.forEach((key) => {
          obj[key as string] = record.get(key);
        });
        return obj as T;
      });
    } finally {
      await session.close();
    }
  }

  async runWriteQuery(
    query: string,
    params: Record<string, unknown> = {},
  ): Promise<Result> {
    if (!this.driver) {
      throw new Error("Neo4j driver not initialized");
    }

    const session = this.driver.session();
    try {
      const result = await session.executeWrite((tx) => tx.run(query, params));
      return result;
    } finally {
      await session.close();
    }
  }

  getSession(): Session {
    if (!this.driver) {
      throw new Error("Neo4j driver not initialized");
    }
    return this.driver.session();
  }
}
