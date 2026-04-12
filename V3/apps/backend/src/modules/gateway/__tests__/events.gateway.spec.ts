import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { EventsGateway } from '../events.gateway';
import { EventsService } from '../events.service';
import { WsAuthGuard } from '../ws-auth.guard';

const USER_ID = 'user-001';
const ROOM_ID = 'room-001';

interface MockSocket {
  id: string;
  data: Record<string, unknown>;
  join: jest.Mock;
  leave: jest.Mock;
  to: jest.Mock;
  emit: jest.Mock;
  disconnect: jest.Mock;
  handshake: { auth: Record<string, string | undefined>; query: Record<string, string | undefined> };
}

function createMockSocket(overrides: Partial<MockSocket> = {}): MockSocket {
  return {
    id: 'socket-001',
    data: { user: { id: USER_ID, role: 'user' } },
    join: jest.fn(),
    leave: jest.fn(),
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    handshake: { auth: {}, query: {} },
    ...overrides,
  };
}

interface MockServer {
  to: jest.Mock;
  emit: jest.Mock;
  sockets: {
    sockets: Map<string, MockSocket>;
    adapter: { rooms: Map<string, Set<string>> };
  };
}

function createMockServer(): MockServer {
  return {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
    sockets: {
      sockets: new Map<string, MockSocket>(),
      adapter: { rooms: new Map<string, Set<string>>() },
    },
  };
}

describe('EventsGateway', () => {
  let gateway: EventsGateway;
  let eventsService: EventsService;
  let mockServer: MockServer;

  beforeEach(async () => {
    mockServer = createMockServer();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsGateway,
        EventsService,
        WsAuthGuard,
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn().mockResolvedValue({
              sub: USER_ID,
              role: 'user',
              type: 'access',
            }),
          },
        },
      ],
    }).compile();

    gateway = module.get<EventsGateway>(EventsGateway);
    eventsService = module.get<EventsService>(EventsService);

    (gateway as unknown as { server: MockServer }).server = mockServer;
    gateway.afterInit();
  });

  describe('handleConnection', () => {
    it('should join user room on authenticated connection', () => {
      const client = createMockSocket();
      gateway.handleConnection(client as unknown as Parameters<typeof gateway.handleConnection>[0]);

      expect(client.join).toHaveBeenCalledWith(`user:${USER_ID}`);
    });

    it('should disconnect client without user data', () => {
      const client = createMockSocket({ data: {} });
      gateway.handleConnection(client as unknown as Parameters<typeof gateway.handleConnection>[0]);

      expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it('should disconnect client with undefined user id', () => {
      const client = createMockSocket({ data: { user: { id: undefined } } });
      gateway.handleConnection(client as unknown as Parameters<typeof gateway.handleConnection>[0]);

      expect(client.disconnect).toHaveBeenCalledWith(true);
    });
  });

  describe('handleDisconnect', () => {
    it('should log disconnect for authenticated user', () => {
      const client = createMockSocket();
      expect(() =>
        gateway.handleDisconnect(client as unknown as Parameters<typeof gateway.handleDisconnect>[0]),
      ).not.toThrow();
    });

    it('should handle disconnect for client without user data', () => {
      const client = createMockSocket({ data: {} });
      expect(() =>
        gateway.handleDisconnect(client as unknown as Parameters<typeof gateway.handleDisconnect>[0]),
      ).not.toThrow();
    });
  });

  describe('handleJoinRoom', () => {
    it('should join the specified room', () => {
      const client = createMockSocket();
      gateway.handleJoinRoom(
        client as unknown as Parameters<typeof gateway.handleJoinRoom>[0],
        { roomId: ROOM_ID },
      );

      expect(client.join).toHaveBeenCalledWith(ROOM_ID);
    });
  });

  describe('handleLeaveRoom', () => {
    it('should leave the specified room', () => {
      const client = createMockSocket();
      gateway.handleLeaveRoom(
        client as unknown as Parameters<typeof gateway.handleLeaveRoom>[0],
        { roomId: ROOM_ID },
      );

      expect(client.leave).toHaveBeenCalledWith(ROOM_ID);
    });
  });

  describe('handleSendMessage', () => {
    it('should emit new_message to the room', () => {
      const client = createMockSocket();
      const sendToRoomSpy = jest.spyOn(eventsService, 'sendToRoom');

      gateway.handleSendMessage(
        client as unknown as Parameters<typeof gateway.handleSendMessage>[0],
        { roomId: ROOM_ID, content: 'Hello', messageType: 'text' as const },
      );

      expect(sendToRoomSpy).toHaveBeenCalledWith(ROOM_ID, 'new_message', expect.objectContaining({
        roomId: ROOM_ID,
        senderId: USER_ID,
        content: 'Hello',
        messageType: 'text',
      }));
    });

    it('should include ISO timestamp in message', () => {
      const client = createMockSocket();
      const sendToRoomSpy = jest.spyOn(eventsService, 'sendToRoom');

      gateway.handleSendMessage(
        client as unknown as Parameters<typeof gateway.handleSendMessage>[0],
        { roomId: ROOM_ID, content: 'Test', messageType: 'text' as const },
      );

      const callArgs = sendToRoomSpy.mock.calls[0][2] as { createdAt: string };
      expect(new Date(callArgs.createdAt).toISOString()).toBe(callArgs.createdAt);
    });
  });

  describe('handleTyping', () => {
    it('should emit typing_indicator to the room excluding sender', () => {
      const client = createMockSocket();

      gateway.handleTyping(
        client as unknown as Parameters<typeof gateway.handleTyping>[0],
        { roomId: ROOM_ID },
      );

      expect(client.to).toHaveBeenCalledWith(ROOM_ID);
      expect(client.emit).toHaveBeenCalledWith('typing_indicator', {
        roomId: ROOM_ID,
        userId: USER_ID,
      });
    });
  });
});

describe('WsAuthGuard', () => {
  let guard: WsAuthGuard;
  let jwtService: JwtService;

  beforeEach(() => {
    jwtService = new JwtService({ secret: 'test-secret' });
    guard = new WsAuthGuard(jwtService);
  });

  function createExecutionContext(client: MockSocket) {
    return {
      switchToWs: () => ({
        getClient: () => client,
      }),
    } as Parameters<typeof guard.canActivate>[0];
  }

  it('should accept valid access token from handshake.auth', async () => {
    const token = 'valid-access-token';
    const client = createMockSocket({ handshake: { auth: { token }, query: {} } });

    jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({
      sub: USER_ID,
      role: 'user',
      type: 'access',
    });

    const context = createExecutionContext(client);
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(client.data.user).toEqual({ id: USER_ID, role: 'user' });
  });

  it('should accept valid access token from handshake.query', async () => {
    const token = 'valid-access-token';
    const client = createMockSocket({ handshake: { auth: {}, query: { token } } });

    jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({
      sub: USER_ID,
      role: 'user',
      type: 'access',
    });

    const context = createExecutionContext(client);
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should reject when no token provided', async () => {
    const client = createMockSocket({ handshake: { auth: {}, query: {} } });

    const context = createExecutionContext(client);
    const result = await guard.canActivate(context);

    expect(result).toBe(false);
  });

  it('should reject refresh token', async () => {
    const token = 'refresh-token';
    const client = createMockSocket({ handshake: { auth: { token }, query: {} } });

    jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({
      sub: USER_ID,
      role: 'user',
      type: 'refresh',
    });

    const context = createExecutionContext(client);
    const result = await guard.canActivate(context);

    expect(result).toBe(false);
  });

  it('should reject invalid token', async () => {
    const token = 'invalid-token';
    const client = createMockSocket({ handshake: { auth: { token }, query: {} } });

    jest.spyOn(jwtService, 'verifyAsync').mockRejectedValue(new Error('Invalid token'));

    const context = createExecutionContext(client);
    const result = await guard.canActivate(context);

    expect(result).toBe(false);
  });

  it('should prefer auth.token over query.token', async () => {
    const authToken = 'auth-token';
    const queryToken = 'query-token';
    const client = createMockSocket({
      handshake: { auth: { token: authToken }, query: { token: queryToken } },
    });

    const verifySpy = jest.spyOn(jwtService, 'verifyAsync').mockResolvedValue({
      sub: USER_ID,
      role: 'user',
      type: 'access',
    });

    const context = createExecutionContext(client);
    await guard.canActivate(context);

    expect(verifySpy).toHaveBeenCalledWith(authToken);
  });
});

describe('EventsService', () => {
  let service: EventsService;
  let mockServer: MockServer;

  beforeEach(() => {
    service = new EventsService();
    mockServer = createMockServer();
    service.setServer(mockServer as unknown as import('socket.io').Server);
  });

  describe('sendToUser', () => {
    it('should emit event to user room', () => {
      service.sendToUser(USER_ID, 'notification', { id: '1' });

      expect(mockServer.to).toHaveBeenCalledWith(`user:${USER_ID}`);
      expect(mockServer.emit).toHaveBeenCalledWith('notification', { id: '1' });
    });

    it('should warn when server not initialized', () => {
      const uninitService = new EventsService();
      expect(() => uninitService.sendToUser(USER_ID, 'test', {})).not.toThrow();
    });
  });

  describe('sendToRoom', () => {
    it('should emit event to specified room', () => {
      service.sendToRoom(ROOM_ID, 'new_message', { content: 'Hello' });

      expect(mockServer.to).toHaveBeenCalledWith(ROOM_ID);
      expect(mockServer.emit).toHaveBeenCalledWith('new_message', { content: 'Hello' });
    });
  });

  describe('broadcast', () => {
    it('should emit event to all clients', () => {
      service.broadcast('order_update', { orderId: '1' });

      expect(mockServer.emit).toHaveBeenCalledWith('order_update', { orderId: '1' });
    });
  });

  describe('getOnlineUsers', () => {
    it('should return empty array when no sockets connected', () => {
      const result = service.getOnlineUsers();
      expect(result).toEqual([]);
    });

    it('should return unique user IDs from connected sockets', () => {
      const socket1 = createMockSocket({ id: 's1', data: { user: { id: 'user-1' } } });
      const socket2 = createMockSocket({ id: 's2', data: { user: { id: 'user-2' } } });
      const socket3 = createMockSocket({ id: 's3', data: { user: { id: 'user-1' } } });

      mockServer.sockets.sockets.set('s1', socket1);
      mockServer.sockets.sockets.set('s2', socket2);
      mockServer.sockets.sockets.set('s3', socket3);

      const result = service.getOnlineUsers();
      expect(result.sort()).toEqual(['user-1', 'user-2']);
    });

    it('should skip sockets without user data', () => {
      const socket1 = createMockSocket({ id: 's1', data: { user: { id: 'user-1' } } });
      const socket2 = createMockSocket({ id: 's2', data: {} });

      mockServer.sockets.sockets.set('s1', socket1);
      mockServer.sockets.sockets.set('s2', socket2);

      const result = service.getOnlineUsers();
      expect(result).toEqual(['user-1']);
    });

    it('should return empty array when server not initialized', () => {
      const uninitService = new EventsService();
      expect(uninitService.getOnlineUsers()).toEqual([]);
    });
  });

  describe('isUserOnline', () => {
    it('should return true when user room exists', () => {
      mockServer.sockets.adapter.rooms.set(`user:${USER_ID}`, new Set(['socket-001']));

      const result = service.isUserOnline(USER_ID);
      expect(result).toBe(true);
    });

    it('should return false when user room does not exist', () => {
      const result = service.isUserOnline('nonexistent-user');
      expect(result).toBe(false);
    });

    it('should return false when user room is empty', () => {
      mockServer.sockets.adapter.rooms.set(`user:${USER_ID}`, new Set());

      const result = service.isUserOnline(USER_ID);
      expect(result).toBe(false);
    });

    it('should return false when server not initialized', () => {
      const uninitService = new EventsService();
      expect(uninitService.isUserOnline(USER_ID)).toBe(false);
    });
  });
});
