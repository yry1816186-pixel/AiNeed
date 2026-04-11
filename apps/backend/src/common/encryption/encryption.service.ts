import * as crypto from "crypto";

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const ITERATIONS = 100000;

@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly encryptionKey: Buffer;

  constructor(private readonly configService: ConfigService) {
    const key = this.configService.get<string>("ENCRYPTION_KEY");
    if (!key) {
      throw new Error("ENCRYPTION_KEY environment variable is required");
    }
    this.encryptionKey = Buffer.from(key, "hex");
    if (this.encryptionKey.length !== 32) {
      throw new Error("ENCRYPTION_KEY must be 32 bytes (64 hex characters)");
    }
  }

  encrypt(plaintext: string): string {
    if (!plaintext) {return plaintext;}

    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);

    const key = crypto.pbkdf2Sync(
      this.encryptionKey,
      salt,
      ITERATIONS,
      32,
      "sha256"
    );

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    const result = Buffer.concat([
      salt,
      iv,
      authTag,
      Buffer.from(encrypted, "hex"),
    ]);

    return `enc:${result.toString("base64")}`;
  }

  decrypt(encryptedValue: string): string {
    if (!encryptedValue?.startsWith("enc:")) {
      return encryptedValue;
    }

    try {
      const data = Buffer.from(encryptedValue.slice(4), "base64");

      const salt = data.subarray(0, SALT_LENGTH);
      const iv = data.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
      const authTag = data.subarray(
        SALT_LENGTH + IV_LENGTH,
        SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH
      );
      const encrypted = data.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);

      const key = crypto.pbkdf2Sync(
        this.encryptionKey,
        salt,
        ITERATIONS,
        32,
        "sha256"
      );

      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, undefined, "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error: unknown) {
      this.logger.error(`Decryption failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error("Failed to decrypt value");
    }
  }

  hash(value: string): string {
    return crypto.createHash("sha256").update(value).digest("hex");
  }

  verifyHash(plaintext: string, hash: string): boolean {
    return this.hash(plaintext) === hash;
  }

  isEncrypted(value: string): boolean {
    return value?.startsWith("enc:");
  }
}
