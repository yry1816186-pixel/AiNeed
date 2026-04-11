/**
 * AI 造型师 E2E 测试
 * @description 测试 AI 造型师对话流程，包括会话管理、消息发送、穿搭推荐等
 */

import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";

describe("AI Stylist E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let refreshToken: string;
  let userId: string;
  let sessionId: string;

  const testUser = {
    email: "ai-stylist-test@example.com",
    password: "Test123456!",
    nickname: "AI Stylist Test User",
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // 清理测试数据
    if (userId) {
      await prisma.aiStylistSession.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.userProfile.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
    await app.close();
  });

  describe("用户注册和认证", () => {
    it("应该成功注册用户", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/register")
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty("access_token");
      expect(response.body).toHaveProperty("refreshToken");
      accessToken = response.body.access_token;
      refreshToken = response.body.refreshToken;
      userId = response.body.user.id;
    });
  });

  describe("GET /ai-stylist/suggestions", () => {
    it("应该返回快捷建议列表", async () => {
      const response = await request(app.getHttpServer())
        .get("/ai-stylist/suggestions")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("suggestions");
      expect(Array.isArray(response.body.suggestions)).toBe(true);
      expect(response.body.suggestions.length).toBeGreaterThan(0);
      
      // 验证建议格式
      const suggestion = response.body.suggestions[0];
      expect(suggestion).toHaveProperty("text");
      expect(suggestion).toHaveProperty("icon");
    });

    it("未认证用户应该返回 401", async () => {
      await request(app.getHttpServer())
        .get("/ai-stylist/suggestions")
        .expect(401);
    });
  });

  describe("GET /ai-stylist/options/styles", () => {
    it("应该返回风格选项列表", async () => {
      const response = await request(app.getHttpServer())
        .get("/ai-stylist/options/styles")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      // 验证选项格式
      const option = response.body[0];
      expect(option).toHaveProperty("value");
      expect(option).toHaveProperty("label");
    });
  });

  describe("GET /ai-stylist/options/occasions", () => {
    it("应该返回场景选项列表", async () => {
      const response = await request(app.getHttpServer())
        .get("/ai-stylist/options/occasions")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      
      // 验证选项格式
      const option = response.body[0];
      expect(option).toHaveProperty("value");
      expect(option).toHaveProperty("label");
    });
  });

  describe("POST /ai-stylist/sessions", () => {
    it("应该成功创建 AI 造型师会话", async () => {
      const response = await request(app.getHttpServer())
        .post("/ai-stylist/sessions")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          entry: "我要一套面试穿搭",
          goal: "商务面试",
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("status");
      sessionId = response.body.id;
    });

    it("应该支持不带参数创建会话", async () => {
      const response = await request(app.getHttpServer())
        .post("/ai-stylist/sessions")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({})
        .expect(201);

      expect(response.body).toHaveProperty("id");
    });

    it("未认证用户应该返回 401", async () => {
      await request(app.getHttpServer())
        .post("/ai-stylist/sessions")
        .send({ entry: "测试" })
        .expect(401);
    });
  });

  describe("GET /ai-stylist/sessions", () => {
    it("应该返回用户的会话列表", async () => {
      const response = await request(app.getHttpServer())
        .get("/ai-stylist/sessions")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("sessions");
      expect(Array.isArray(response.body.sessions)).toBe(true);
      expect(response.body.sessions.length).toBeGreaterThan(0);
    });

    it("应该支持分页参数", async () => {
      const response = await request(app.getHttpServer())
        .get("/ai-stylist/sessions")
        .query({ limit: 5, offset: 0 })
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.sessions.length).toBeLessThanOrEqual(5);
    });
  });

  describe("GET /ai-stylist/sessions/:sessionId", () => {
    it("应该返回会话状态", async () => {
      const response = await request(app.getHttpServer())
        .get(`/ai-stylist/sessions/${sessionId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("id", sessionId);
      expect(response.body).toHaveProperty("status");
    });

    it("不存在的会话应该返回 404", async () => {
      await request(app.getHttpServer())
        .get("/ai-stylist/sessions/non-existent-id")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe("POST /ai-stylist/sessions/:sessionId/messages", () => {
    it("应该成功发送消息", async () => {
      const response = await request(app.getHttpServer())
        .post(`/ai-stylist/sessions/${sessionId}/messages`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          message: "我想要一套正式的商务面试穿搭",
        })
        .expect(201);

      expect(response.body).toHaveProperty("response");
      expect(typeof response.body.response).toBe("string");
    });

    it("空消息应该返回 400", async () => {
      await request(app.getHttpServer())
        .post(`/ai-stylist/sessions/${sessionId}/messages`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ message: "" })
        .expect(400);
    });

    it("消息过长应该返回 400", async () => {
      const longMessage = "a".repeat(2001);
      await request(app.getHttpServer())
        .post(`/ai-stylist/sessions/${sessionId}/messages`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ message: longMessage })
        .expect(400);
    });
  });

  describe("POST /ai-stylist/chat (兼容旧版)", () => {
    it("应该支持无状态聊天", async () => {
      const response = await request(app.getHttpServer())
        .post("/ai-stylist/chat")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          message: "推荐一套春季穿搭",
        })
        .expect(201);

      expect(response.body).toHaveProperty("response");
    });

    it("应该支持带历史记录的聊天", async () => {
      const response = await request(app.getHttpServer())
        .post("/ai-stylist/chat")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          message: "有没有其他颜色选择？",
          conversationHistory: [
            { role: "user", content: "推荐一套春季穿搭" },
            { role: "assistant", content: "我推荐浅色系的春季穿搭..." },
          ],
        })
        .expect(201);

      expect(response.body).toHaveProperty("response");
    });
  });

  describe("POST /ai-stylist/sessions/:sessionId/resolve", () => {
    it("应该生成穿搭方案", async () => {
      const response = await request(app.getHttpServer())
        .post(`/ai-stylist/sessions/${sessionId}/resolve`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(201);

      expect(response.body).toHaveProperty("outfits");
      expect(Array.isArray(response.body.outfits)).toBe(true);
    });
  });

  describe("POST /ai-stylist/sessions/:sessionId/feedback", () => {
    it("应该成功提交正面反馈", async () => {
      const response = await request(app.getHttpServer())
        .post(`/ai-stylist/sessions/${sessionId}/feedback`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          outfitIndex: 0,
          action: "like",
        })
        .expect(201);

      expect(response.body).toHaveProperty("success", true);
    });

    it("应该成功提交负面反馈", async () => {
      const response = await request(app.getHttpServer())
        .post(`/ai-stylist/sessions/${sessionId}/feedback`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          outfitIndex: 0,
          action: "dislike",
        })
        .expect(201);

      expect(response.body).toHaveProperty("success", true);
    });
  });

  describe("GET /ai-stylist/sessions/:sessionId/feedback", () => {
    it("应该返回会话反馈记录", async () => {
      const response = await request(app.getHttpServer())
        .get(`/ai-stylist/sessions/${sessionId}/feedback`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe("DELETE /ai-stylist/sessions/:sessionId", () => {
    it("应该成功删除会话", async () => {
      await request(app.getHttpServer())
        .delete(`/ai-stylist/sessions/${sessionId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);
    });

    it("删除不存在的会话应该返回 404", async () => {
      await request(app.getHttpServer())
        .delete("/ai-stylist/sessions/non-existent-id")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe("性能测试", () => {
    let newSessionId: string;

    beforeAll(async () => {
      // 创建新会话用于性能测试
      const response = await request(app.getHttpServer())
        .post("/ai-stylist/sessions")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({});
      newSessionId = response.body.id;
    });

    it("创建会话响应时间应该小于 500ms", async () => {
      const start = Date.now();
      await request(app.getHttpServer())
        .post("/ai-stylist/sessions")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({})
        .expect(201);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(500);
    });

    it("获取会话列表响应时间应该小于 200ms", async () => {
      const start = Date.now();
      await request(app.getHttpServer())
        .get("/ai-stylist/sessions")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(200);
    });

    it("发送消息响应时间应该小于 5000ms (含 LLM 调用)", async () => {
      const start = Date.now();
      await request(app.getHttpServer())
        .post(`/ai-stylist/sessions/${newSessionId}/messages`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ message: "测试消息" })
        .expect(201);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000);
    });
  });
});
