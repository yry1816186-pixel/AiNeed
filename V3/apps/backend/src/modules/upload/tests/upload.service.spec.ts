import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UploadService } from '../upload.service';
import {
  IStorageProvider,
  STORAGE_PROVIDER_TOKEN,
  StorageUploadResult,
} from '../providers/storage-provider.interface';

const createMockFile = (
  overrides: Partial<Express.Multer.File> = {},
): Express.Multer.File => ({
  fieldname: 'file',
  originalname: 'test.jpg',
  encoding: '7bit',
  mimetype: 'image/jpeg',
  size: 1024,
  buffer: Buffer.from('fake-image-data'),
  destination: '',
  filename: '',
  path: '',
  stream: null as never,
  ...overrides,
});

describe('UploadService', () => {
  let service: UploadService;

  const mockStorageProvider: IStorageProvider = {
    upload: jest.fn(),
    delete: jest.fn(),
    getUrl: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        APP_ENV: 'test',
        MINIO_ENDPOINT: 'localhost',
        MINIO_PORT: '9000',
        MINIO_BUCKET: 'aineed-uploads',
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        { provide: STORAGE_PROVIDER_TOKEN, useValue: mockStorageProvider },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadImage', () => {
    const uploadResult: StorageUploadResult = {
      url: 'http://localhost:9000/aineed-uploads/post/2026/04/12/uuid.jpg',
      key: 'post/2026/04/12/uuid.jpg',
    };

    beforeEach(() => {
      (mockStorageProvider.upload as jest.Mock).mockResolvedValue(uploadResult);
    });

    it('should upload a valid image and return response', async () => {
      const file = createMockFile();
      const result = await service.uploadImage(file, 'post');

      expect(result.url).toBe(uploadResult.url);
      expect(result.key).toBe(uploadResult.key);
      expect(result.size).toBe(file.size);
      expect(result.mimeType).toBe(file.mimetype);
      expect(mockStorageProvider.upload).toHaveBeenCalledWith(
        file.buffer,
        expect.stringMatching(/^post\/\d{4}\/\d{2}\/\d{2}\/[\w-]+\.jpg$/),
        file.mimetype,
      );
    });

    it('should use default type "post" when type is not provided', async () => {
      const file = createMockFile();
      await service.uploadImage(file);

      expect(mockStorageProvider.upload).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.stringMatching(/^post\//),
        expect.any(String),
      );
    });

    it('should throw BadRequestException for invalid MIME type', async () => {
      const file = createMockFile({ mimetype: 'application/pdf' });

      await expect(service.uploadImage(file)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.uploadImage(file)).rejects.toThrow(
        'Invalid file type',
      );
    });

    it('should throw BadRequestException for file exceeding size limit', async () => {
      const file = createMockFile({ size: 11 * 1024 * 1024 });

      await expect(service.uploadImage(file)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.uploadImage(file)).rejects.toThrow(
        'File size exceeds',
      );
    });

    it('should accept jpeg, png, and webp MIME types', async () => {
      const mimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

      for (const mimeType of mimeTypes) {
        const file = createMockFile({ mimetype: mimeType });
        const result = await service.uploadImage(file);
        expect(result.mimeType).toBe(mimeType);
      }
    });

    it('should generate key with correct type prefix', async () => {
      const types = ['avatar', 'clothing', 'design', 'post'] as const;

      for (const type of types) {
        jest.clearAllMocks();
        (mockStorageProvider.upload as jest.Mock).mockResolvedValue(uploadResult);
        const file = createMockFile();
        await service.uploadImage(file, type);
        expect(mockStorageProvider.upload).toHaveBeenCalledWith(
          expect.any(Buffer),
          expect.stringMatching(new RegExp(`^${type}/`)),
          expect.any(String),
        );
      }
    });

    it('should convert jpeg extension to jpg', async () => {
      const file = createMockFile({ originalname: 'photo.jpeg' });
      await service.uploadImage(file);

      const callArgs = (mockStorageProvider.upload as jest.Mock).mock.calls[0];
      expect(callArgs[1]).toMatch(/\.jpg$/);
    });

    it('should handle missing extension gracefully', async () => {
      const file = createMockFile({ originalname: 'noext' });
      await service.uploadImage(file);

      const callArgs = (mockStorageProvider.upload as jest.Mock).mock.calls[0];
      expect(callArgs[1]).toMatch(/\.jpg$/);
    });
  });

  describe('uploadImages', () => {
    const uploadResult: StorageUploadResult = {
      url: 'http://localhost:9000/aineed-uploads/post/2026/04/12/uuid.jpg',
      key: 'post/2026/04/12/uuid.jpg',
    };

    beforeEach(() => {
      (mockStorageProvider.upload as jest.Mock).mockResolvedValue(uploadResult);
    });

    it('should upload multiple valid images', async () => {
      const files = [
        createMockFile({ originalname: 'a.jpg' }),
        createMockFile({ originalname: 'b.png' }),
      ];

      const result = await service.uploadImages(files, 'post');

      expect(result.items).toHaveLength(2);
      expect(mockStorageProvider.upload).toHaveBeenCalledTimes(2);
    });

    it('should throw BadRequestException for empty file array', async () => {
      await expect(service.uploadImages([])).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.uploadImages([])).rejects.toThrow('No files provided');
    });

    it('should throw BadRequestException when exceeding max batch count', async () => {
      const files = Array.from({ length: 10 }, () => createMockFile());

      await expect(service.uploadImages(files)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.uploadImages(files)).rejects.toThrow(
        'Maximum 9 files allowed',
      );
    });

    it('should accept exactly 9 files', async () => {
      const files = Array.from({ length: 9 }, () => createMockFile());

      const result = await service.uploadImages(files);
      expect(result.items).toHaveLength(9);
    });
  });

  describe('deleteFile', () => {
    it('should call storage provider delete', async () => {
      const key = 'post/2026/04/12/uuid.jpg';
      (mockStorageProvider.delete as jest.Mock).mockResolvedValue(undefined);

      await service.deleteFile(key);

      expect(mockStorageProvider.delete).toHaveBeenCalledWith(key);
    });
  });
});
