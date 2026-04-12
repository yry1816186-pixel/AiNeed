import * as fs from 'fs';
import { LocalProvider } from '../providers/local.provider';

// Mock fs module
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    writeFile: jest.fn(),
    access: jest.fn(),
    unlink: jest.fn(),
  },
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

const mockedFs = fs as jest.Mocked<typeof fs>;

describe('LocalProvider', () => {
  let provider: LocalProvider;
  let originalCwd: string;

  beforeAll(() => {
    originalCwd = process.cwd();
  });

  afterAll(() => {
    process.chdir(originalCwd);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (mockedFs.existsSync as jest.Mock).mockReturnValue(true);
    provider = new LocalProvider();
  });

  describe('upload', () => {
    it('should upload a file and return url and key', async () => {
      (mockedFs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);

      const buffer = Buffer.from('test image data');
      const result = await provider.upload(buffer, 'post/2026/01/test.jpg', 'image/jpeg');

      expect(result.url).toBe('/uploads/post/2026/01/test.jpg');
      expect(result.key).toBe('post/2026/01/test.jpg');
      expect(mockedFs.promises.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        buffer,
      );
    });

    it('should create directory when it does not exist during upload', async () => {
      // The provider was already constructed in beforeEach, so only the
      // ensureDir call inside upload remains. Make it return false to trigger mkdirSync.
      (mockedFs.existsSync as jest.Mock).mockReturnValueOnce(false);

      (mockedFs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);

      const buffer = Buffer.from('test data');
      await provider.upload(buffer, 'avatar/2026/photo.png', 'image/png');

      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(
        expect.any(String),
        { recursive: true },
      );
    });

    it('should throw error for path traversal with ".."', async () => {
      const buffer = Buffer.from('malicious');

      await expect(
        provider.upload(buffer, '../../etc/passwd', 'text/plain'),
      ).rejects.toThrow('path traversal');
    });

    it('should throw error for key starting with "/"', async () => {
      const buffer = Buffer.from('malicious');

      await expect(
        provider.upload(buffer, '/absolute/path/file.jpg', 'image/jpeg'),
      ).rejects.toThrow('path traversal');
    });

    it('should throw for resolved path outside upload dir', async () => {
      // On Windows, an absolute path like C:\Windows passes validateKey
      // (no ".." and doesn't start with "/") but resolve escapes the uploadDir
      const buffer = Buffer.from('test');

      await expect(
        provider.upload(buffer, 'C:\\Windows\\System32\\exploit.jpg', 'image/jpeg'),
      ).rejects.toThrow('path traversal');
    });

    it('should upload a key without path traversal successfully', async () => {
      (mockedFs.promises.writeFile as jest.Mock).mockResolvedValue(undefined);

      const buffer = Buffer.from('test');
      const result = await provider.upload(buffer, 'post/test.jpg', 'image/jpeg');
      expect(result.key).toBe('post/test.jpg');
    });
  });

  describe('delete', () => {
    it('should delete an existing file', async () => {
      (mockedFs.promises.access as jest.Mock).mockResolvedValue(undefined);
      (mockedFs.promises.unlink as jest.Mock).mockResolvedValue(undefined);

      await provider.delete('post/2026/test.jpg');

      expect(mockedFs.promises.unlink).toHaveBeenCalledWith(
        expect.any(String),
      );
    });

    it('should handle file not found gracefully', async () => {
      (mockedFs.promises.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));

      // Should not throw
      await provider.delete('nonexistent/file.jpg');
    });

    it('should throw error for path traversal key in delete', async () => {
      await expect(
        provider.delete('../../etc/passwd'),
      ).rejects.toThrow('path traversal');
    });

    it('should throw error for key starting with "/" in delete', async () => {
      await expect(
        provider.delete('/absolute/path'),
      ).rejects.toThrow('path traversal');
    });

    it('should throw error for resolved path outside upload dir in delete', async () => {
      await expect(
        provider.delete('C:\\Windows\\System32\\exploit.jpg'),
      ).rejects.toThrow('path traversal');
    });
  });

  describe('getUrl', () => {
    it('should return URL with /uploads/ prefix', () => {
      const url = provider.getUrl('post/2026/test.jpg');

      expect(url).toBe('/uploads/post/2026/test.jpg');
    });

    it('should handle nested paths', () => {
      const url = provider.getUrl('avatar/2026/01/sub/photo.png');

      expect(url).toBe('/uploads/avatar/2026/01/sub/photo.png');
    });
  });
});
