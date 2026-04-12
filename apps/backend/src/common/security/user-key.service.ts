import * as crypto from "crypto";

import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { PrismaService } from "../prisma/prisma.service";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const PBKDF2_ITERATIONS = 100000;
const DEK_LENGTH = 32;
const CACHE_MAX_SIZE = 1000;
const CACHE_TTL_MS = 60 * 60 * 1000;

interface CachedDek {
  dek: Buffer;
  cachedAt: number;
}

@Injectable()
export class UserKeyService {
  private readonly logger = new Logger(UserKeyService.name);
  private readonly masterKey: Buffer;
  private readonly dekCache = new Map<string, CachedDek>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const key = this.configService.get<string>("ENCRYPTION_KEY");
    if (!key) {
      throw new Error("ENCRYPTION_KEY environment variable is required");
    }
    this.masterKey = Buffer.from(key, "hex");
    if (this.masterKey.length !== 32) {
      throw new Error("ENCRYPTION_KEY must be 32 bytes (64 hex characters)");
    }
  }

  async encryptForUser(userId: string, plaintext: string): Promise<string> {
    if (!plaintext) {
      return plaintext;
    }
    const dek = await this.getOrCreateUserKey(userId);
    return this.encryptWithDek(dek, plaintext);
  }

  async decryptForUser(userId: string, ciphertext: string): Promise<string> {
    if (!ciphertext?.startsWith("enc:")) {
      return ciphertext;
    }
    const dek = await this.getOrCreateUserKey(userId);
    return this.decryptWithDek(dek, ciphertext);
  }

  async encryptBufferForUser(userId: string, buffer: Buffer): Promise<Buffer> {
    const dek = await this.getOrCreateUserKey(userId);
    return this.encryptBufferWithDek(dek, buffer);
  }

  async decryptBufferForUser(userId: string, encryptedBuffer: Buffer): Promise<Buffer> {
    const dek = await this.getOrCreateUserKey(userId);
    return this.decryptBufferWithDek(dek, encryptedBuffer);
  }

  async rotateUserKey(userId: string): Promise<void> {
    this.dekCache.delete(userId);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    const newDek = crypto.randomBytes(DEK_LENGTH);
    const salt = user.encryptionKeySalt || crypto.randomBytes(SALT_LENGTH).toString("hex");
    const kek = this.deriveKek(salt);
    const encryptedDek = this.encryptDekWithKek(kek, newDek);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        encryptionKeySalt: salt,
        encryptedDek,
        keyVersion: (user.keyVersion || 0) + 1,
      },
    });

    this.dekCache.set(userId, { dek: newDek, cachedAt: Date.now() });
    this.evictCacheIfNeeded();

    this.logger.log(`Rotated encryption key for user ${userId} to version ${user.keyVersion + 1}`);
  }

  private async getOrCreateUserKey(userId: string): Promise<Buffer> {
    const cached = this.dekCache.get(userId);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      return cached.dek;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { encryptionKeySalt: true, encryptedDek: true, keyVersion: true },
    });

    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    if (user.encryptedDek && user.encryptionKeySalt) {
      const kek = this.deriveKek(user.encryptionKeySalt);
      const dek = this.decryptDekWithKek(kek, user.encryptedDek);

      this.dekCache.set(userId, { dek, cachedAt: Date.now() });
      this.evictCacheIfNeeded();
      return dek;
    }

    return await this.createUserKey(userId);
  }

  private async createUserKey(userId: string): Promise<Buffer> {
    const dek = crypto.randomBytes(DEK_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH).toString("hex");
    const kek = this.deriveKek(salt);
    const encryptedDek = this.encryptDekWithKek(kek, dek);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        encryptionKeySalt: salt,
        encryptedDek,
        keyVersion: 1,
      },
    });

    this.dekCache.set(userId, { dek, cachedAt: Date.now() });
    this.evictCacheIfNeeded();

    this.logger.log(`Created encryption key for user ${userId}`);
    return dek;
  }

  private deriveKek(salt: string): Buffer {
    return crypto.pbkdf2Sync(
      this.masterKey,
      Buffer.from(salt, "hex"),
      PBKDF2_ITERATIONS,
      DEK_LENGTH,
      "sha256",
    );
  }

  private encryptDekWithKek(kek: Buffer, dek: Buffer): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, kek, iv);
    let encrypted = cipher.update(dek);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();

    const result = Buffer.concat([iv, authTag, encrypted]);
    return `enc:${result.toString("base64")}`;
  }

  private decryptDekWithKek(kek: Buffer, encryptedDek: string): Buffer {
    const data = Buffer.from(encryptedDek.slice(4), "base64");
    const iv = data.subarray(0, IV_LENGTH);
    const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, kek, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted;
  }

  private encryptWithDek(dek: Buffer, plaintext: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, dek, iv);
    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag();

    const result = Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, "hex"),
    ]);

    return `enc:${result.toString("base64")}`;
  }

  private decryptWithDek(dek: Buffer, ciphertext: string): string {
    const data = Buffer.from(ciphertext.slice(4), "base64");
    const iv = data.subarray(0, IV_LENGTH);
    const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, dek, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, undefined, "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  private encryptBufferWithDek(dek: Buffer, buffer: Buffer): Buffer {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, dek, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return Buffer.concat([
      Buffer.from("ENC1", "ascii"),
      iv,
      authTag,
      encrypted,
    ]);
  }

  private decryptBufferWithDek(dek: Buffer, encryptedBuffer: Buffer): Buffer {
    if (encryptedBuffer.length < 4 + IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new Error("Invalid encrypted buffer format");
    }

    const magic = encryptedBuffer.subarray(0, 4).toString("ascii");
    if (magic !== "ENC1") {
      throw new Error("Invalid encrypted buffer magic bytes");
    }

    const iv = encryptedBuffer.subarray(4, 4 + IV_LENGTH);
    const authTag = encryptedBuffer.subarray(4 + IV_LENGTH, 4 + IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = encryptedBuffer.subarray(4 + IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, dek, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  private evictCacheIfNeeded(): void {
    if (this.dekCache.size > CACHE_MAX_SIZE) {
      const now = Date.now();
      let oldestKey: string | null = null;
      let oldestTime = Infinity;

      for (const [key, value] of this.dekCache) {
        if (value.cachedAt < oldestTime) {
          oldestTime = value.cachedAt;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        this.dekCache.delete(oldestKey);
      }

      for (const [key, value] of this.dekCache) {
        if (now - value.cachedAt > CACHE_TTL_MS) {
          this.dekCache.delete(key);
        }
      }
    }
  }
}
