import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UploadController } from '../upload.controller';
import { UploadService } from '../upload.service';
import type { UploadResponseDto, BatchUploadResponseDto } from '../dto/upload-response.dto';

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

describe('UploadController', () => {
  let controller: UploadController;
  let service: UploadService;

  const mockUploadService = {
    uploadImage: jest.fn(),
    uploadImages: jest.fn(),
    deleteFile: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadController],
      providers: [
        { provide: UploadService, useValue: mockUploadService },
      ],
    }).compile();

    controller = module.get<UploadController>(UploadController);
    service = module.get<UploadService>(UploadService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('uploadImage', () => {
    const uploadResponse: UploadResponseDto = {
      url: 'http://localhost:9000/aineed-uploads/post/2026/04/12/uuid.jpg',
      key: 'post/2026/04/12/uuid.jpg',
      size: 1024,
      mimeType: 'image/jpeg',
      width: 800,
      height: 600,
    };

    it('should upload a single image successfully', async () => {
      const file = createMockFile();
      mockUploadService.uploadImage.mockResolvedValue(uploadResponse);

      const result = await controller.uploadImage(file);

      expect(result).toEqual(uploadResponse);
      expect(service.uploadImage).toHaveBeenCalledWith(file, 'post');
    });

    it('should throw BadRequestException when no file is provided', async () => {
      await expect(controller.uploadImage(null as unknown as Express.Multer.File)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should pass type parameter to service', async () => {
      const file = createMockFile();
      mockUploadService.uploadImage.mockResolvedValue(uploadResponse);

      await controller.uploadImage(file, 'avatar');

      expect(service.uploadImage).toHaveBeenCalledWith(file, 'avatar');
    });

    it('should default to post type for unknown type values', async () => {
      const file = createMockFile();
      mockUploadService.uploadImage.mockResolvedValue(uploadResponse);

      await controller.uploadImage(file, 'unknown-type');

      expect(service.uploadImage).toHaveBeenCalledWith(file, 'post');
    });

    it('should accept outfit-image type', async () => {
      const file = createMockFile();
      mockUploadService.uploadImage.mockResolvedValue(uploadResponse);

      await controller.uploadImage(file, 'outfit-image');

      expect(service.uploadImage).toHaveBeenCalledWith(file, 'outfit-image');
    });

    it('should accept design type', async () => {
      const file = createMockFile();
      mockUploadService.uploadImage.mockResolvedValue(uploadResponse);

      await controller.uploadImage(file, 'design');

      expect(service.uploadImage).toHaveBeenCalledWith(file, 'design');
    });

    it('should default to post when type is undefined', async () => {
      const file = createMockFile();
      mockUploadService.uploadImage.mockResolvedValue(uploadResponse);

      await controller.uploadImage(file, undefined);

      expect(service.uploadImage).toHaveBeenCalledWith(file, 'post');
    });
  });

  describe('uploadImages', () => {
    const batchResponse: BatchUploadResponseDto = {
      items: [
        {
          url: 'http://localhost:9000/aineed-uploads/post/2026/04/12/uuid1.jpg',
          key: 'post/2026/04/12/uuid1.jpg',
          size: 1024,
          mimeType: 'image/jpeg',
          width: 800,
          height: 600,
        },
        {
          url: 'http://localhost:9000/aineed-uploads/post/2026/04/12/uuid2.jpg',
          key: 'post/2026/04/12/uuid2.jpg',
          size: 2048,
          mimeType: 'image/png',
          width: 1024,
          height: 768,
        },
      ],
    };

    it('should upload multiple images successfully', async () => {
      const files = [createMockFile(), createMockFile()];
      mockUploadService.uploadImages.mockResolvedValue(batchResponse);

      const result = await controller.uploadImages(files);

      expect(result).toEqual(batchResponse);
      expect(service.uploadImages).toHaveBeenCalledWith(files, 'post');
    });

    it('should pass type parameter to service', async () => {
      const files = [createMockFile()];
      mockUploadService.uploadImages.mockResolvedValue({ items: [] });

      await controller.uploadImages(files, 'clothing');

      expect(service.uploadImages).toHaveBeenCalledWith(files, 'clothing');
    });

    it('should default to post type for unknown type values', async () => {
      const files = [createMockFile()];
      mockUploadService.uploadImages.mockResolvedValue({ items: [] });

      await controller.uploadImages(files, 'invalid');

      expect(service.uploadImages).toHaveBeenCalledWith(files, 'post');
    });

    it('should default to post when type is undefined', async () => {
      const files = [createMockFile()];
      mockUploadService.uploadImages.mockResolvedValue({ items: [] });

      await controller.uploadImages(files, undefined);

      expect(service.uploadImages).toHaveBeenCalledWith(files, 'post');
    });
  });

  describe('deleteFile', () => {
    it('should delete a file successfully', async () => {
      mockUploadService.deleteFile.mockResolvedValue(undefined);

      const result = await controller.deleteFile('post/2026/04/12/uuid.jpg');

      expect(result).toEqual({ success: true });
      expect(service.deleteFile).toHaveBeenCalledWith('post/2026/04/12/uuid.jpg');
    });
  });
});
