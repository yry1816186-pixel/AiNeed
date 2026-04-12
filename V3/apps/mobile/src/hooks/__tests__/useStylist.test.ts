import * as StylistService from '../../services/stylist.service';
import type { StylistSession, StylistMessage } from '../../types';

jest.mock('../../services/stylist.service');
jest.mock('../../stores/stylist.store');

const mockCreateSession = StylistService.createSession as jest.MockedFunction<typeof StylistService.createSession>;
const mockSendMessage = StylistService.sendMessage as jest.MockedFunction<typeof StylistService.sendMessage>;
const mockGetSessions = StylistService.getSessions as jest.MockedFunction<typeof StylistService.getSessions>;
const mockGetSession = StylistService.getSession as jest.MockedFunction<typeof StylistService.getSession>;
const mockDeleteSession = StylistService.deleteSession as jest.MockedFunction<typeof StylistService.deleteSession>;

describe('useStylist hook logic', () => {
  let mockStore: Record<string, jest.Mock>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockStore = {
      setSession: jest.fn(),
      addMessage: jest.fn(),
      setLoading: jest.fn(),
      setStep: jest.fn(),
      setStreamingText: jest.fn(),
      setError: jest.fn(),
      setOutfits: jest.fn(),
      appendStreamingText: jest.fn(),
      resetResults: jest.fn(),
      incrementRetry: jest.fn(),
    };
  });

  describe('StylistService.createSession', () => {
    it('should create a session with occasion and budget', async () => {
      const mockSession: StylistSession = {
        id: 'session-1',
        userId: 'user-1',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };
      mockCreateSession.mockResolvedValue(mockSession);

      const result = await StylistService.createSession({
        occasion: 'work',
        budget: 'under200',
      });

      expect(StylistService.createSession).toHaveBeenCalledWith({
        occasion: 'work',
        budget: 'under200',
      });
      expect(result.id).toBe('session-1');
    });

    it('should create a session with style tags', async () => {
      const mockSession: StylistSession = {
        id: 'session-2',
        userId: 'user-1',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };
      mockCreateSession.mockResolvedValue(mockSession);

      const result = await StylistService.createSession({
        styleTags: ['minimal', 'korean'],
      });

      expect(result.id).toBe('session-2');
    });

    it('should handle creation errors', async () => {
      mockCreateSession.mockRejectedValue(new Error('创建会话失败'));

      await expect(
        StylistService.createSession({ occasion: 'work' }),
      ).rejects.toThrow('创建会话失败');
    });
  });

  describe('StylistService.sendMessage', () => {
    it('should send a message to a session', async () => {
      const mockMessage: StylistMessage = {
        id: 'msg-1',
        sessionId: 'session-1',
        role: 'assistant',
        content: 'I recommend a casual look',
        createdAt: '2026-01-01',
      };
      mockSendMessage.mockResolvedValue(mockMessage);

      const result = await StylistService.sendMessage('session-1', {
        content: '面试穿什么',
      });

      expect(StylistService.sendMessage).toHaveBeenCalledWith('session-1', {
        content: '面试穿什么',
      });
      expect(result.content).toBe('I recommend a casual look');
    });

    it('should handle message send errors', async () => {
      mockSendMessage.mockRejectedValue(new Error('发送消息失败'));

      await expect(
        StylistService.sendMessage('session-1', { content: 'test' }),
      ).rejects.toThrow('发送消息失败');
    });
  });

  describe('StylistService.getSessions', () => {
    it('should return list of sessions', async () => {
      const mockSessions: StylistSession[] = [
        { id: 's1', userId: 'u1', createdAt: '2026-01-01', updatedAt: '2026-01-01' },
        { id: 's2', userId: 'u1', createdAt: '2026-01-02', updatedAt: '2026-01-02' },
      ];
      mockGetSessions.mockResolvedValue(mockSessions);

      const result = await StylistService.getSessions();
      expect(result).toHaveLength(2);
    });

    it('should handle empty sessions list', async () => {
      mockGetSessions.mockResolvedValue([]);

      const result = await StylistService.getSessions();
      expect(result).toEqual([]);
    });
  });

  describe('StylistService.getSession', () => {
    it('should return session details', async () => {
      const mockSession: StylistSession = {
        id: 's1',
        userId: 'u1',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };
      mockGetSession.mockResolvedValue(mockSession);

      const result = await StylistService.getSession('s1');
      expect(result.id).toBe('s1');
    });
  });

  describe('StylistService.deleteSession', () => {
    it('should delete a session', async () => {
      mockDeleteSession.mockResolvedValue(undefined);

      await StylistService.deleteSession('s1');
      expect(StylistService.deleteSession).toHaveBeenCalledWith('s1');
    });
  });

  describe('store interactions', () => {
    it('should call setSession after creating session', async () => {
      const mockSession: StylistSession = {
        id: 'session-1',
        userId: 'user-1',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      };
      mockCreateSession.mockResolvedValue(mockSession);

      const session = await StylistService.createSession({ occasion: 'work' });
      mockStore.setSession(session);

      expect(mockStore.setSession).toHaveBeenCalledWith(mockSession);
    });

    it('should call addMessage after sending message', async () => {
      const mockMessage: StylistMessage = {
        id: 'msg-1',
        sessionId: 'session-1',
        role: 'assistant',
        content: 'Hello',
        createdAt: '2026-01-01',
      };
      mockSendMessage.mockResolvedValue(mockMessage);

      const message = await StylistService.sendMessage('session-1', { content: 'Hi' });
      mockStore.addMessage(message);

      expect(mockStore.addMessage).toHaveBeenCalledWith(mockMessage);
    });

    it('should call resetResults before generating new outfit', () => {
      mockStore.resetResults();
      expect(mockStore.resetResults).toHaveBeenCalled();
    });

    it('should call incrementRetry on retry', () => {
      mockStore.incrementRetry();
      expect(mockStore.incrementRetry).toHaveBeenCalled();
    });

    it('should call setError on failure', () => {
      mockStore.setError('Something went wrong');
      expect(mockStore.setError).toHaveBeenCalledWith('Something went wrong');
    });
  });

  describe('SSE stream callbacks', () => {
    it('should handle onText callback by appending text', () => {
      mockStore.appendStreamingText('Hello');
      mockStore.appendStreamingText(' World');

      expect(mockStore.appendStreamingText).toHaveBeenCalledTimes(2);
      expect(mockStore.appendStreamingText).toHaveBeenNthCalledWith(1, 'Hello');
      expect(mockStore.appendStreamingText).toHaveBeenNthCalledWith(2, ' World');
    });

    it('should handle onDone callback by setting loading false', () => {
      mockStore.setLoading(false);
      mockStore.setStep('result');

      expect(mockStore.setLoading).toHaveBeenCalledWith(false);
      expect(mockStore.setStep).toHaveBeenCalledWith('result');
    });

    it('should handle onError callback', () => {
      mockStore.setError('AI响应超时');
      mockStore.setLoading(false);

      expect(mockStore.setError).toHaveBeenCalledWith('AI响应超时');
      expect(mockStore.setLoading).toHaveBeenCalledWith(false);
    });
  });
});
