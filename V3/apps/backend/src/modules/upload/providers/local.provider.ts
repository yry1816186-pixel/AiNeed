import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import {
  IStorageProvider,
  StorageUploadResult,
} from './storage-provider.interface';

@Injectable()
export class LocalProvider implements IStorageProvider {
  private readonly logger = new Logger(LocalProvider.name);
  private readonly uploadDir: string;

  constructor() {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    this.ensureDir(this.uploadDir);
  }

  private validateKey(key: string): void {
    if (key.includes('..') || key.startsWith('/')) {
      throw new Error(`Invalid storage key: path traversal detected`);
    }
  }

  async upload(
    buffer: Buffer,
    key: string,
    _mimeType: string,
  ): Promise<StorageUploadResult> {
    this.validateKey(key);

    const resolvedPath = path.resolve(this.uploadDir, key);
    if (!resolvedPath.startsWith(path.resolve(this.uploadDir))) {
      throw new Error(`Invalid storage key: path traversal detected`);
    }

    const dir = path.dirname(resolvedPath);
    this.ensureDir(dir);

    await fs.promises.writeFile(resolvedPath, buffer);

    return {
      url: this.getUrl(key),
      key,
    };
  }

  async delete(key: string): Promise<void> {
    this.validateKey(key);

    const resolvedPath = path.resolve(this.uploadDir, key);
    if (!resolvedPath.startsWith(path.resolve(this.uploadDir))) {
      throw new Error(`Invalid storage key: path traversal detected`);
    }

    const filePath = resolvedPath;
    try {
      await fs.promises.access(filePath, fs.constants.F_OK);
      await fs.promises.unlink(filePath);
    } catch {
      this.logger.warn(`File not found for deletion: ${key}`);
    }
  }

  getUrl(key: string): string {
    return `/uploads/${key}`;
  }

  private ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
