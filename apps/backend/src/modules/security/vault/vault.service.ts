import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";

export interface IVaultClient {
  getSecret(path: string): Promise<Record<string, unknown>>;
  rotateKey(keyName: string): Promise<void>;
  healthCheck(): Promise<boolean>;
}

export interface VaultSecret {
  data: Record<string, unknown>;
  metadata?: {
    version: number;
    created_time: string;
    destroyed: boolean;
  };
}

export interface KeyRotationEvent {
  keyName: string;
  rotatedAt: Date;
  version: number;
}

@Injectable()
export class VaultService implements IVaultClient, OnModuleInit {
  private readonly logger = new Logger(VaultService.name);
  private vaultAddr: string | null = null;
  private vaultToken: string | null = null;
  private isMockMode = true;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  onModuleInit() {
    this.vaultAddr = this.configService.get<string>("VAULT_ADDR") ?? null;
    this.vaultToken = this.configService.get<string>("VAULT_TOKEN") ?? null;

    if (this.vaultAddr && this.vaultToken) {
      this.isMockMode = false;
      this.logger.log(`Vault client initialized - connected to ${this.vaultAddr}`);
    } else {
      this.isMockMode = true;
      this.logger.warn("Vault not configured (VAULT_ADDR/VAULT_TOKEN missing) - using mock implementation with env vars");
    }
  }

  async getSecret(path: string): Promise<Record<string, unknown>> {
    if (this.isMockMode) {
      return this.getSecretFromEnv(path);
    }

    try {
      const response = await fetch(`${this.vaultAddr}/v1/secret/data/${path}`, {
        headers: {
          "X-Vault-Token": this.vaultToken!,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        this.logger.error(`Vault read failed for path ${path}: ${response.status} ${response.statusText}`);
        return this.getSecretFromEnv(path);
      }

      const body = await response.json() as { data?: { data?: Record<string, unknown> } };
      return body.data?.data ?? {};
    } catch (error) {
      this.logger.error(`Vault connection error for path ${path}: ${error instanceof Error ? error.message : String(error)}`);
      return this.getSecretFromEnv(path);
    }
  }

  async rotateKey(keyName: string): Promise<void> {
    if (this.isMockMode) {
      this.logger.warn(`Key rotation requested for ${keyName} in mock mode - no-op`);
      this.emitRotationEvent(keyName, 1);
      return;
    }

    try {
      const response = await fetch(`${this.vaultAddr}/v1/transit/keys/${keyName}/rotate`, {
        method: "POST",
        headers: {
          "X-Vault-Token": this.vaultToken!,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Vault key rotation failed: ${response.status} ${response.statusText}`);
      }

      const keyInfo = await this.getKeyVersion(keyName);
      this.emitRotationEvent(keyName, keyInfo);
      this.logger.log(`Rotated Vault key: ${keyName} to version ${keyInfo}`);
    } catch (error) {
      this.logger.error(`Key rotation failed for ${keyName}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    if (this.isMockMode) {
      return true;
    }

    try {
      const response = await fetch(`${this.vaultAddr}/v1/sys/health`, {
        headers: { "X-Vault-Token": this.vaultToken! },
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  isUsingMock(): boolean {
    return this.isMockMode;
  }

  private async getSecretFromEnv(path: string): Promise<Record<string, unknown>> {
    const envPrefix = path.toUpperCase().replace(/\//g, "_");
    const result: Record<string, unknown> = {};

    const envMappings: Record<string, string> = {
      encryption: "ENCRYPTION_KEY",
      database: "DATABASE_URL",
      jwt: "JWT_SECRET",
      redis: "REDIS_URL",
    };

    const envKey = envMappings[path] ?? envPrefix;
    const value = this.configService.get<string>(envKey);

    if (value) {
      result.value = value;
    }

    return result;
  }

  private async getKeyVersion(keyName: string): Promise<number> {
    try {
      const response = await fetch(`${this.vaultAddr}/v1/transit/keys/${keyName}`, {
        headers: {
          "X-Vault-Token": this.vaultToken!,
        },
      });

      if (!response.ok) {
        return 1;
      }

      const body = await response.json() as { data?: { latest_version?: number } };
      return body.data?.latest_version ?? 1;
    } catch {
      return 1;
    }
  }

  private emitRotationEvent(keyName: string, version: number): void {
    const event: KeyRotationEvent = {
      keyName,
      rotatedAt: new Date(),
      version,
    };
    this.eventEmitter.emit("vault.key.rotated", event);
  }
}
