import { Test } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { StylistController } from '../stylist.controller';
import { StylistService } from '../stylist.service';

describe('StylistController', () => {
  let controller: StylistController;
  let service: StylistService;

  const mockStylistService = {
    createSession: jest.fn(),
    getSessions: jest.fn(),
    deleteSession: jest.fn(),
    getMessages: jest.fn(),
    streamChat: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [StylistController],
      providers: [
        { provide: StylistService, useValue: mockStylistService },
      ],
    }).compile();

    controller = module.get<StylistController>(StylistController);
    service = module.get<StylistService>(StylistService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('should create a session', async () => {
      const expectedResult = { id: 'session-1', title: 'Test', createdAt: '2026-01-01T00:00:00.000Z' };
      mockStylistService.createSession.mockResolvedValue(expectedResult);

      const result = await controller.createSession('user-1', { title: 'Test' });
      expect(result).toEqual(expectedResult);
      expect(service.createSession).toHaveBeenCalledWith('user-1', { title: 'Test' });
    });
  });

  describe('getSessions', () => {
    it('should return sessions list', async () => {
      const expectedResult = {
        items: [{ id: 'session-1', title: 'Test', lastMessage: 'Hi', createdAt: '2026-01-01T00:00:00.000Z' }],
      };
      mockStylistService.getSessions.mockResolvedValue(expectedResult);

      const result = await controller.getSessions('user-1');
      expect(result).toEqual(expectedResult);
      expect(service.getSessions).toHaveBeenCalledWith('user-1', undefined, undefined);
    });
  });

  describe('deleteSession', () => {
    it('should delete a session', async () => {
      const expectedResult = { id: 'session-1' };
      mockStylistService.deleteSession.mockResolvedValue(expectedResult);

      const result = await controller.deleteSession('user-1', 'session-1');
      expect(result).toEqual(expectedResult);
      expect(service.deleteSession).toHaveBeenCalledWith('user-1', 'session-1');
    });

    it('should throw NotFoundException for non-existent session', async () => {
      mockStylistService.deleteSession.mockRejectedValue(
        new NotFoundException({ code: 'SESSION_NOT_FOUND', message: '会话不存在' }),
      );

      await expect(controller.deleteSession('user-1', 'non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException for other user session', async () => {
      mockStylistService.deleteSession.mockRejectedValue(
        new ForbiddenException({ code: 'FORBIDDEN', message: '无权删除此会话' }),
      );

      await expect(controller.deleteSession('user-1', 'session-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getMessages', () => {
    it('should return messages for a session', async () => {
      const expectedResult = {
        items: [
          { id: 'msg-1', role: 'user', content: 'Hello', metadata: null, createdAt: '2026-01-01T00:00:00.000Z' },
        ],
      };
      mockStylistService.getMessages.mockResolvedValue(expectedResult);

      const result = await controller.getMessages('user-1', 'session-1');
      expect(result).toEqual(expectedResult);
      expect(service.getMessages).toHaveBeenCalledWith('user-1', 'session-1', undefined, undefined);
    });
  });

  describe('sendMessage', () => {
    it('should stream SSE events', async () => {
      async function* mockStream() {
        yield { type: 'text' as const, content: '你好！' };
        yield { type: 'done' as const, content: '' };
      }

      mockStylistService.streamChat.mockReturnValue(mockStream());

      const mockResponse = {
        setHeader: jest.fn(),
        flushHeaders: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      };

      await controller.sendMessage(
        'user-1',
        'session-1',
        { content: '你好' },
        {} as never,
        mockResponse as never,
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
      expect(mockResponse.flushHeaders).toHaveBeenCalled();
      expect(mockResponse.write).toHaveBeenCalledTimes(2);
      expect(mockResponse.end).toHaveBeenCalled();
    });

    it('should handle stream errors', async () => {
      async function* mockStream() {
        yield { type: 'error' as const, content: 'Stream error' };
      }

      mockStylistService.streamChat.mockReturnValue(mockStream());

      const mockResponse = {
        setHeader: jest.fn(),
        flushHeaders: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      };

      await controller.sendMessage(
        'user-1',
        'session-1',
        { content: '你好' },
        {} as never,
        mockResponse as never,
      );

      const writeCalls = mockResponse.write.mock.calls;
      const errorCall = writeCalls.find((call: string[]) => call[0].includes('error'));
      expect(errorCall).toBeDefined();
      expect(mockResponse.end).toHaveBeenCalled();
    });

    it('should handle exception during streaming', async () => {
      mockStylistService.streamChat.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const mockResponse = {
        setHeader: jest.fn(),
        flushHeaders: jest.fn(),
        write: jest.fn(),
        end: jest.fn(),
      };

      await controller.sendMessage(
        'user-1',
        'session-1',
        { content: '你好' },
        {} as never,
        mockResponse as never,
      );

      expect(mockResponse.end).toHaveBeenCalled();
    });
  });
});
