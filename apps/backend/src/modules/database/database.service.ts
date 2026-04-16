import { Injectable, Inject, OnModuleDestroy, Logger } from "@nestjs/common";
import { Pool, PoolClient, QueryResult } from "pg";

import { DATABASE_POOL } from "./database.module";

export interface QueryOptions {
  name?: string;
  text: string;
  values?: unknown[];
}

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(@Inject(DATABASE_POOL) private pool: Pool) {}

  /**
   * Execute a parameterized query
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async query<T = any>(options: QueryOptions): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const result = await this.pool.query<T>(options.text, options.values);
      const duration = Date.now() - start;

      const slowQueryThreshold = Number(process.env.SLOW_QUERY_THRESHOLD_MS) || 500;
      if (duration > slowQueryThreshold) {
        this.logger.warn(
          `Slow query detected (${duration}ms): ${options.name || options.text.substring(0, 100)}`,
        );
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Query error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      throw error;
    }
  }

  /**
   * Get a dedicated client from the pool for transactions
   */
  async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  /**
   * Execute a transaction with automatic commit/rollback
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query("BEGIN");
      const result = await callback(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Run EXPLAIN ANALYZE on a query for debugging
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async explainQuery(options: QueryOptions): Promise<any[]> {
    const explainQuery = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${options.text}`;
    const result = await this.pool.query(explainQuery, options.values);
    return result.rows;
  }

  /**
   * Get pool statistics
   */
  getPoolStats() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }

  /**
   * Cleanup on module destroy
   */
  async onModuleDestroy() {
    await this.pool.end();
    this.logger.log("Database pool closed");
  }
}
