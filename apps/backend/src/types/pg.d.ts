declare module "pg" {
  export interface QueryResult<T = unknown> {
    rows: T[];
    rowCount: number | null;
  }

  export interface PoolClient {
    query<T = unknown>(text: string, values?: unknown[]): Promise<QueryResult<T>>;
    release(): void;
  }

  export class Pool {
    constructor(config?: Record<string, unknown>);
    query<T = unknown>(text: string, values?: unknown[]): Promise<QueryResult<T>>;
    connect(): Promise<PoolClient>;
    end(): Promise<void>;
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  }
}
