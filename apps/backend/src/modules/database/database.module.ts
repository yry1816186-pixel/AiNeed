import { Module, Global } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Pool } from "pg";

export const DATABASE_POOL = "DATABASE_POOL";

export interface DatabasePoolConfig {
  max: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_POOL,
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>(
          "DATABASE_URL",
          "postgresql://localhost:5432/xuno",
        );

        const poolConfig: DatabasePoolConfig = {
          max: configService.get<number>("DB_POOL_SIZE", 20),
          idleTimeoutMillis: configService.get<number>(
            "DB_IDLE_TIMEOUT",
            30000,
          ),
          connectionTimeoutMillis: configService.get<number>(
            "DB_CONNECTION_TIMEOUT",
            2000,
          ),
        };

        return new Pool({
          connectionString: databaseUrl,
          ...poolConfig,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [DATABASE_POOL],
})
export class DatabaseModule {}
