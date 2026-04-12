import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MinioProvider } from '../providers/minio.provider';

// Mock the Minio client
const mockMinioClient = {
  bucketExists: jest.fn(),
  makeBucket: jest.fn(),
  putObject: jest.fn(),
  removeObject: jest.fn(),
};

jest.mock('minio', () => ({
  Client: jest.fn().mockImplementation(() => mockMinioClient),
}));

describe('MinioProvider', () => {
  let provider: MinioProvider;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        MinioProvider,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              const config: Record<string, string | number> = {
                MINIO_ENDPOINT: 'localhost',
                MINIO_PORT: 9000,
                MINIO_BUCKET: 'aineed-uploads',
                MINIO_ACCESS_KEY: 'minioadmin',
                MINIO_SECRET_KEY: 'minioadmin',
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    provider = module.get<MinioProvider>(MinioProvider);
  });

  describe('onModuleInit', () => {
    it('should not create bucket when it already exists', async () => {
      mockMinioClient.bucketExists.mockResolvedValueOnce(true);

      await provider.onModuleInit();

      expect(mockMinioClient.bucketExists).toHaveBeenCalledWith('aineed-uploads');
      expect(mockMinioClient.makeBucket).not.toHaveBeenCalled();
    });

    it('should create bucket when it does not exist', async () => {
      mockMinioClient.bucketExists.mockResolvedValueOnce(false);
      mockMinioClient.makeBucket.mockResolvedValueOnce(undefined);

      await provider.onModuleInit();

      expect(mockMinioClient.makeBucket).toHaveBeenCalledWith('aineed-uploads');
    });
  });

  describe('upload', () => {
    it('should upload buffer to minio and return url and key', async () => {
      mockMinioClient.putObject.mockResolvedValueOnce({});

      const buffer = Buffer.from('test image data');
      const result = await provider.upload(buffer, 'post/test.jpg', 'image/jpeg');

      expect(result.url).toBe('http://localhost:9000/aineed-uploads/post/test.jpg');
      expect(result.key).toBe('post/test.jpg');
      expect(mockMinioClient.putObject).toHaveBeenCalledWith(
        'aineed-uploads',
        'post/test.jpg',
        buffer,
        buffer.length,
        { 'Content-Type': 'image/jpeg' },
      );
    });

    it('should upload with correct content type for png', async () => {
      mockMinioClient.putObject.mockResolvedValueOnce({});

      const buffer = Buffer.from('png data');
      await provider.upload(buffer, 'avatar/photo.png', 'image/png');

      expect(mockMinioClient.putObject).toHaveBeenCalledWith(
        'aineed-uploads',
        'avatar/photo.png',
        buffer,
        buffer.length,
        { 'Content-Type': 'image/png' },
      );
    });
  });

  describe('delete', () => {
    it('should remove object from minio', async () => {
      mockMinioClient.removeObject.mockResolvedValueOnce(undefined);

      await provider.delete('post/test.jpg');

      expect(mockMinioClient.removeObject).toHaveBeenCalledWith(
        'aineed-uploads',
        'post/test.jpg',
      );
    });
  });

  describe('getUrl', () => {
    it('should return correct URL with endpoint, port, and bucket', () => {
      const url = provider.getUrl('post/2026/test.jpg');

      expect(url).toBe('http://localhost:9000/aineed-uploads/post/2026/test.jpg');
    });

    it('should handle different key paths', () => {
      const url = provider.getUrl('avatar/user123.png');

      expect(url).toContain('aineed-uploads/avatar/user123.png');
    });
  });
});
