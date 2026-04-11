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

  async upload(
    buffer: Buffer,
    key: string,
    _mimeType: string,
  ): Promise<StorageUploadResult> {
    const filePath = path.join(this.uploadDir, key);
    const dir = path.dirname(filePath);
    this.ensureDir(dir);

    await fs.promises.writeFile(filePath, buffer);

    return {
      url: this.getUrl(key),
      key,
    };
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.uploadDir, key);
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
