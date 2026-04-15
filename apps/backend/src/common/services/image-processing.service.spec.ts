import { Test } from '@nestjs/testing';

import { IMAGE_SIZES } from '../utils/image-sizes';

import { ImageProcessingService } from './image-processing.service';

jest.mock('sharp', () => {
  const allChains: any[] = [];

  const createChain = () => {
    const chain = {
      resize: jest.fn().mockReturnThis(),
      webp: jest.fn().mockReturnThis(),
      jpeg: jest.fn().mockReturnThis(),
      png: jest.fn().mockReturnThis(),
      toBuffer: jest.fn().mockResolvedValue(Buffer.from('fake-image-data')),
      metadata: jest.fn().mockResolvedValue({ width: 200, height: 200, format: 'webp', hasAlpha: false }),
    };
    allChains.push(chain);
    return chain;
  };

  const sharp = jest.fn().mockImplementation(() => createChain()) as any;
  sharp.strategy = { attention: 'attention' };
  sharp._getAllChains = () => allChains;

  return { default: sharp, __esModule: true };
});

describe('ImageProcessingService', () => {
  let service: ImageProcessingService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ImageProcessingService],
    }).compile();

    service = module.get<ImageProcessingService>(ImageProcessingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateSizes', () => {
    it('should generate all default sizes', async () => {
      const buffer = Buffer.from('test-image');
      const results = await service.generateSizes(buffer);

      expect(results).toHaveLength(5);
      expect(results.map(r => r.size)).toEqual(['thumbnail', 'small', 'medium', 'large', 'original']);
    });

    it('should generate only specified sizes', async () => {
      const buffer = Buffer.from('test-image');
      const results = await service.generateSizes(buffer, ['thumbnail', 'medium']);

      expect(results).toHaveLength(2);
      expect(results[0]!.size).toBe('thumbnail');
      expect(results[1]!.size).toBe('medium');
    });

    it('should use cover fit for thumbnail', async () => {
      const buffer = Buffer.from('test-image');
      await service.generateSizes(buffer, ['thumbnail']);

      const sharpMock = jest.requireMock('sharp').default;
      const chains = sharpMock._getAllChains();
      const resizeChain = chains.find((c: any) => c.resize.mock.calls.length > 0);
      expect(resizeChain.resize).toHaveBeenCalledWith(
        IMAGE_SIZES.thumbnail.width,
        IMAGE_SIZES.thumbnail.height,
        expect.objectContaining({ fit: 'cover' })
      );
    });

    it('should use inside fit for non-thumbnail sizes', async () => {
      const buffer = Buffer.from('test-image');
      await service.generateSizes(buffer, ['small']);

      const sharpMock = jest.requireMock('sharp').default;
      const chains = sharpMock._getAllChains();
      const resizeChain = chains.find((c: any) => c.resize.mock.calls.length > 0);
      expect(resizeChain.resize).toHaveBeenCalledWith(
        IMAGE_SIZES.small.width,
        IMAGE_SIZES.small.height,
        expect.objectContaining({ fit: 'inside' })
      );
    });

    it('should not resize for original size', async () => {
      const buffer = Buffer.from('test-image');
      await service.generateSizes(buffer, ['original']);

      const sharpMock = jest.requireMock('sharp').default;
      const chains = sharpMock._getAllChains();
      const resizeChain = chains.find((c: any) => c.resize.mock.calls.length > 0);
      expect(resizeChain).toBeUndefined();
    });

    it('should output webp format', async () => {
      const buffer = Buffer.from('test-image');
      const results = await service.generateSizes(buffer, ['thumbnail']);

      expect(results[0]!.format).toBe('webp');
      expect(results[0]!.contentType).toBe('image/webp');
    });
  });

  describe('optimize', () => {
    it('should optimize to webp by default', async () => {
      const buffer = Buffer.from('test-image');
      await service.optimize(buffer);

      const sharpMock = jest.requireMock('sharp').default;
      const chains = sharpMock._getAllChains();
      const webpChain = chains.find((c: any) => c.webp.mock.calls.length > 0);
      expect(webpChain).toBeDefined();
    });

    it('should optimize to jpeg when specified', async () => {
      const buffer = Buffer.from('test-image');
      await service.optimize(buffer, { format: 'jpeg' });

      const sharpMock = jest.requireMock('sharp').default;
      const chains = sharpMock._getAllChains();
      const jpegChain = chains.find((c: any) => c.jpeg.mock.calls.length > 0);
      expect(jpegChain).toBeDefined();
    });

    it('should resize when width or height provided', async () => {
      const buffer = Buffer.from('test-image');
      await service.optimize(buffer, { width: 500, height: 500 });

      const sharpMock = jest.requireMock('sharp').default;
      const chains = sharpMock._getAllChains();
      const resizeChain = chains.find((c: any) => c.resize.mock.calls.length > 0);
      expect(resizeChain.resize).toHaveBeenCalledWith(500, 500, expect.objectContaining({ fit: 'inside' }));
    });
  });

  describe('getMetadata', () => {
    it('should return image metadata', async () => {
      const buffer = Buffer.from('test-image');
      const metadata = await service.getMetadata(buffer);

      expect(metadata).toHaveProperty('width');
      expect(metadata).toHaveProperty('height');
      expect(metadata).toHaveProperty('format');
      expect(metadata).toHaveProperty('contentType');
      expect(metadata).toHaveProperty('hasAlpha');
    });

    it('should map format to content type', async () => {
      const buffer = Buffer.from('test-image');
      const metadata = await service.getMetadata(buffer);

      expect(metadata.contentType).toBe('image/webp');
    });
  });
});
