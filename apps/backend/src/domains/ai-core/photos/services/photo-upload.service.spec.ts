import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';


import { PrismaService } from '../../../../common/prisma/prisma.service';
import { MalwareScannerService } from '../../../../common/security/malware-scanner.service';
import { ImageProcessingService } from '../../../../common/services/image-processing.service';
import { StorageService } from '../../../../common/storage/storage.service';
import { ImageSizeName } from '../../../../common/utils/image-sizes';

import { PhotoUploadService } from './photo-upload.service';

jest.mock('../../../common/security/image-sanitizer', () => ({
  stripExifFromBuffer: jest.fn().mockResolvedValue(Buffer.from('sanitized')),
}));

jest.mock('../../../common/security/upload-validator', () => ({
  validateImageFile: jest.fn(),
}));

describe('PhotoUploadService', () => {
  let service: PhotoUploadService;
  let imageProcessing: ImageProcessingService;
  let storage: StorageService;
  let malwareScanner: MalwareScannerService;

  const mockImageProcessing = {
    getMetadata: jest.fn().mockResolvedValue({
      width: 1000,
      height: 1000,
      size: 50000,
      format: 'jpeg',
      contentType: 'image/jpeg',
    }),
    generateSizes: jest.fn().mockImplementation((buffer: Buffer, sizes: string[]) => {
      const allImages = [
        { size: 'thumbnail', buffer: Buffer.from('thumb'), width: 200, height: 200, format: 'webp', contentType: 'image/webp' },
        { size: 'small', buffer: Buffer.from('small'), width: 400, height: 400, format: 'webp', contentType: 'image/webp' },
        { size: 'medium', buffer: Buffer.from('medium'), width: 800, height: 800, format: 'webp', contentType: 'image/webp' },
        { size: 'large', buffer: Buffer.from('large'), width: 1200, height: 1200, format: 'webp', contentType: 'image/webp' },
        { size: 'original', buffer: Buffer.from('original'), width: 1000, height: 1000, format: 'webp', contentType: 'image/webp' },
      ];
      return Promise.resolve(allImages.filter(img => sizes.includes(img.size)));
    }),
  };

  const mockStorage = {
    uploadBuffer: jest.fn().mockResolvedValue(undefined),
    getFileUrl: jest.fn().mockImplementation((path: string) => Promise.resolve(`http://minio:9000/xuno/${path}`)),
    delete: jest.fn().mockResolvedValue(undefined),
  };

  const mockMalwareScanner = {
    scanImageBuffer: jest.fn().mockResolvedValue({ safe: true, threats: [] }),
  };

  const mockPrisma = {};

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        PhotoUploadService,
        { provide: ImageProcessingService, useValue: mockImageProcessing },
        { provide: StorageService, useValue: mockStorage },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MalwareScannerService, useValue: mockMalwareScanner },
      ],
    }).compile();

    service = module.get<PhotoUploadService>(PhotoUploadService);
    imageProcessing = module.get<ImageProcessingService>(ImageProcessingService);
    storage = module.get<StorageService>(StorageService);
    malwareScanner = module.get<MalwareScannerService>(MalwareScannerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadMultiSize', () => {
    const mockFile = {
      fieldname: 'file',
      originalname: 'test.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      buffer: Buffer.from('test-image-data'),
      size: 1024,
    } as Express.Multer.File;

    it('should upload all default sizes', async () => {
      const result = await service.uploadMultiSize('user-1', mockFile);

      expect(result.urls).toHaveProperty('thumbnail');
      expect(result.urls).toHaveProperty('small');
      expect(result.urls).toHaveProperty('medium');
      expect(result.urls).toHaveProperty('large');
      expect(result.urls).toHaveProperty('original');
      expect(mockStorage.uploadBuffer).toHaveBeenCalledTimes(5);
    });

    it('should upload only specified sizes', async () => {
      const result = await service.uploadMultiSize('user-1', mockFile, ['thumbnail', 'medium']);

      expect(result.urls).toHaveProperty('thumbnail');
      expect(result.urls).toHaveProperty('medium');
      expect(mockStorage.uploadBuffer).toHaveBeenCalledTimes(2);
    });

    it('should throw if malware scan fails', async () => {
      mockMalwareScanner.scanImageBuffer.mockResolvedValueOnce({ safe: false, threats: ['malware'] });

      await expect(service.uploadMultiSize('user-1', mockFile)).rejects.toThrow(BadRequestException);
    });

    it('should return metadata from original image', async () => {
      const result = await service.uploadMultiSize('user-1', mockFile);

      expect(result.metadata.width).toBe(1000);
      expect(result.metadata.height).toBe(1000);
      expect(result.metadata.format).toBe('jpeg');
    });

    it('should use correct storage path format', async () => {
      await service.uploadMultiSize('user-1', mockFile, ['thumbnail']);

      expect(mockStorage.uploadBuffer).toHaveBeenCalledWith(
        expect.stringContaining('photos/user-1/'),
        expect.any(Buffer),
        'image/webp',
      );
    });
  });

  describe('deleteMultiSize', () => {
    it('should delete all size variants', async () => {
      const urls: Record<ImageSizeName, string> = {
        thumbnail: 'http://minio/photos/user-1/photo-1/thumbnail.webp',
        small: 'http://minio/photos/user-1/photo-1/small.webp',
        medium: 'http://minio/photos/user-1/photo-1/medium.webp',
        large: 'http://minio/photos/user-1/photo-1/large.webp',
        original: 'http://minio/photos/user-1/photo-1/original.webp',
      };

      await service.deleteMultiSize('user-1', 'photo-1', urls);

      expect(mockStorage.delete).toHaveBeenCalledTimes(5);
    });

    it('should continue deleting even if one fails', async () => {
      mockStorage.delete.mockRejectedValueOnce(new Error('delete failed'));

      const urls: Record<ImageSizeName, string> = {
        thumbnail: 'http://minio/photos/thumb.webp',
        small: 'http://minio/photos/small.webp',
        medium: 'http://minio/photos/medium.webp',
        large: 'http://minio/photos/large.webp',
        original: 'http://minio/photos/original.webp',
      };

      await service.deleteMultiSize('user-1', 'photo-1', urls);

      expect(mockStorage.delete).toHaveBeenCalledTimes(5);
    });
  });
});
