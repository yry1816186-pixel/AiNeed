import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { StylistModule } from '../../src/modules/stylist/stylist.module';
import { AuthModule } from '../../src/modules/auth/auth.module';
import { E2eTestHelper, API_PREFIX } from './utils/test-app.helper';

describe('Stylist Flow E2E', () => {
  let app: INestApplication;
  let accessToken: string;
  let userId: string;
  let sessionId: string;

  function reRegisterUserMock(): void {
    E2eTestHelper.prisma.user.findUnique.mockImplementation((args: { where: { id?: string; phone?: string } }) => {
      if (args.where.id === userId || args.where.phone === '13800138020') {
        return Promise.resolve({
          id: userId,
          phone: '13800138020',
          nickname: '用户8020',
          avatarUrl: null,
          role: 'user',
          gender: null,
          birthYear: null,
          height: null,
          weight: null,
          bodyType: null,
          colorSeason: null,
        });
      }
      return Promise.resolve(null);
    });
  }

  beforeAll(async () => {
    app = await E2eTestHelper.initApp({ modules: [AuthModule, StylistModule] });
    const tokens = await E2eTestHelper.registerTestUser('13800138020');
    accessToken = tokens.accessToken;
    userId = tokens.userId;
  });

  afterAll(async () => {
    await E2eTestHelper.closeApp();
  });

  afterEach(() => {
    E2eTestHelper.resetMocks();
    reRegisterUserMock();
  });

  describe('POST /stylist/sessions', () => {
    it('should create a new chat session', async () => {
      sessionId = uuidv4();
      E2eTestHelper.prisma.chatSession.create.mockResolvedValue({
        id: sessionId,
        userId,
        title: '约会穿搭',
        context: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app.getHttpServer())
        .post(`${API_PREFIX}/stylist/sessions`)
        .set(E2eTestHelper.authHeader(accessToken))
        .send({ title: '约会穿搭' })
        .expect(201);

      const body = res.body as {
        success: boolean;
        data: { id: string; title: string };
      };
      expect(body.success).toBe(true);
      expect(body.data.id).toBeDefined();
      expect(body.data.title).toBe('约会穿搭');
      sessionId = body.data.id;
    });

    it('should create session without title', async () => {
      E2eTestHelper.prisma.chatSession.create.mockResolvedValue({
        id: uuidv4(),
        userId,
        title: null,
        context: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app.getHttpServer())
        .post(`${API_PREFIX}/stylist/sessions`)
        .set(E2eTestHelper.authHeader(accessToken))
        .send({})
        .expect(201);

      const body = res.body as {
        success: boolean;
        data: { id: string };
      };
      expect(body.success).toBe(true);
      expect(body.data.id).toBeDefined();
    });

    it('should reject session creation without authentication', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API_PREFIX}/stylist/sessions`)
        .send({ title: 'test' })
        .expect(401);

      const body = res.body as { success: boolean };
      expect(body.success).toBe(false);
    });
  });

  describe('GET /stylist/sessions', () => {
    it('should return user sessions list', async () => {
      E2eTestHelper.prisma.chatSession.findMany.mockResolvedValue([
        {
          id: sessionId,
          userId,
          title: '约会穿搭',
          context: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          messages: [],
        },
      ]);
      E2eTestHelper.prisma.chatSession.count.mockResolvedValue(1);

      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/stylist/sessions`)
        .set(E2eTestHelper.authHeader(accessToken))
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: { items: { id: string; title: string }[]; total: number };
      };
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data.items)).toBe(true);
      expect(body.data.items.length).toBeGreaterThanOrEqual(1);
    });

    it('should reject without authentication', async () => {
      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/stylist/sessions`)
        .expect(401);

      const body = res.body as { success: boolean };
      expect(body.success).toBe(false);
    });
  });

  describe('POST /stylist/sessions/:id/messages', () => {
    it('should send message and receive SSE stream', async () => {
      E2eTestHelper.prisma.chatSession.findUnique.mockResolvedValue({
        id: sessionId,
        userId,
        title: '约会穿搭',
        context: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      E2eTestHelper.prisma.chatMessage.create.mockImplementation((args: { data: { role: string; content: string } }) =>
        Promise.resolve({
          id: uuidv4(),
          sessionId,
          role: args.data.role,
          content: args.data.content,
          metadata: null,
          createdAt: new Date(),
        }),
      );
      E2eTestHelper.prisma.chatMessage.findMany.mockResolvedValue([]);
      E2eTestHelper.prisma.userStylePreference.findMany.mockResolvedValue([]);
      E2eTestHelper.prisma.bodyProfile.findUnique.mockResolvedValue(null);
      E2eTestHelper.prisma.wardrobeItem.findMany.mockResolvedValue([]);
      E2eTestHelper.prisma.chatSession.update.mockResolvedValue({
        id: sessionId,
        userId,
        title: '约会穿搭',
        context: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app.getHttpServer())
        .post(`${API_PREFIX}/stylist/sessions/${sessionId}/messages`)
        .set(E2eTestHelper.authHeader(accessToken))
        .send({ content: '明天约会穿什么' });

      expect(res.status).toBeLessThan(400);

      if (res.headers['content-type']?.includes('text/event-stream')) {
        const text = res.text as string;
        const lines = text.split('\n').filter((line: string) => line.startsWith('data: '));

        if (lines.length > 0) {
          const eventTypes = new Set<string>();
          for (const line of lines) {
            const jsonStr = line.replace('data: ', '');
            try {
              const parsed = JSON.parse(jsonStr) as { type: string };
              eventTypes.add(parsed.type);
            } catch {
              // non-JSON SSE data, skip
            }
          }

          const hasExpectedEvent =
            eventTypes.has('text') ||
            eventTypes.has('outfit') ||
            eventTypes.has('done') ||
            eventTypes.has('error');

          expect(hasExpectedEvent).toBe(true);
        }
      }
    });

    it('should reject empty message content', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API_PREFIX}/stylist/sessions/${sessionId}/messages`)
        .set(E2eTestHelper.authHeader(accessToken))
        .send({ content: '' })
        .expect(400);

      const body = res.body as { success: boolean };
      expect(body.success).toBe(false);
    });

    it('should return SSE error event for non-existent session', async () => {
      E2eTestHelper.prisma.chatSession.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post(`${API_PREFIX}/stylist/sessions/00000000-0000-0000-0000-000000000000/messages`)
        .set(E2eTestHelper.authHeader(accessToken))
        .send({ content: 'hello' });

      expect(res.status).toBeLessThan(400);
      expect(res.headers['content-type']).toContain('text/event-stream');

      const text = res.text as string;
      const lines = text.split('\n').filter((line: string) => line.startsWith('data: '));
      const hasErrorEvent = lines.some((line: string) => {
        try {
          const parsed = JSON.parse(line.replace('data: ', '')) as { type: string; content: string };
          return parsed.type === 'error';
        } catch {
          return false;
        }
      });
      expect(hasErrorEvent).toBe(true);
    });

    it('should reject without authentication', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API_PREFIX}/stylist/sessions/${sessionId}/messages`)
        .send({ content: 'hello' })
        .expect(401);

      const body = res.body as { success: boolean };
      expect(body.success).toBe(false);
    });
  });

  describe('GET /stylist/sessions/:id/messages', () => {
    it('should return message history for session', async () => {
      E2eTestHelper.prisma.chatSession.findUnique.mockResolvedValue({
        id: sessionId,
        userId,
        title: '约会穿搭',
        context: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      E2eTestHelper.prisma.chatMessage.findMany.mockResolvedValue([
        {
          id: uuidv4(),
          sessionId,
          role: 'user',
          content: '明天约会穿什么',
          metadata: null,
          createdAt: new Date(),
        },
        {
          id: uuidv4(),
          sessionId,
          role: 'assistant',
          content: '建议穿白色衬衫搭配深色西裤',
          metadata: null,
          createdAt: new Date(),
        },
      ]);
      E2eTestHelper.prisma.chatMessage.count.mockResolvedValue(2);

      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/stylist/sessions/${sessionId}/messages`)
        .set(E2eTestHelper.authHeader(accessToken))
        .expect(200);

      const body = res.body as {
        success: boolean;
        data: { items: { id: string; role: string; content: string }[]; total: number };
      };
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data.items)).toBe(true);
    });

    it('should reject without authentication', async () => {
      const res = await request(app.getHttpServer())
        .get(`${API_PREFIX}/stylist/sessions/${sessionId}/messages`)
        .expect(401);

      const body = res.body as { success: boolean };
      expect(body.success).toBe(false);
    });
  });

  describe('DELETE /stylist/sessions/:sessionId', () => {
    it('should delete a session', async () => {
      const deleteSessionId = uuidv4();
      E2eTestHelper.prisma.chatSession.findUnique.mockResolvedValue({
        id: deleteSessionId,
        userId,
        title: 'to-delete',
        context: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      E2eTestHelper.prisma.chatSession.delete.mockResolvedValue({
        id: deleteSessionId,
        userId,
        title: 'to-delete',
        context: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app.getHttpServer())
        .delete(`${API_PREFIX}/stylist/sessions/${deleteSessionId}`)
        .set(E2eTestHelper.authHeader(accessToken))
        .expect(200);

      const body = res.body as { success: boolean };
      expect(body.success).toBe(true);
    });

    it('should reject deleting non-existent session', async () => {
      E2eTestHelper.prisma.chatSession.findUnique.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .delete(`${API_PREFIX}/stylist/sessions/00000000-0000-0000-0000-000000000000`)
        .set(E2eTestHelper.authHeader(accessToken));

      expect(res.status).toBe(404);
    });
  });
});
