export interface StorageUploadResult {
  url: string;
  key: string;
}

export const STORAGE_PROVIDER_TOKEN = Symbol('IStorageProvider');

export interface IStorageProvider {
  upload(
    buffer: Buffer,
    key: string,
    mimeType: string,
  ): Promise<StorageUploadResult>;

  delete(key: string): Promise<void>;

  getUrl(key: string): string;
}
