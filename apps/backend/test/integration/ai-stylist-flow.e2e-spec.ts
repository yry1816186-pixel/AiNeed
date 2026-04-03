/**
 * AI 造型师完整流程集成测试
 * @description 测试 AI 造型师从创建会话到获取推荐的完整业务流程
 * 
 * 测试流程:
 * 1. 用户注册/登录
 * 2. 创建 AI 造型师会话
 * 3. 发送消息进行对话
 * 4. 获取穿搭推荐
 * 5. 提交反馈
 * 6. 会话管理
 */

import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../../src/app.module";
import { PrismaService } from "../../src/common/prisma/prisma.service";
import {
  generateTestEmail,
  measureResponseTime,
} from "../utils/test.utils";
import {
  stylistSessionFixtures,
  stylistMessageFixtures,
  performanceThresholds,
} from "../utils/fixtures";

describe("AI Stylist Flow E2E - AI 造型师流程", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let refreshToken: string;
  let userId: string;
  let sessionId: string;

  const testUser = {
    email: generateTestEmail(),
    password: "Test123456!",
    nickname: "AI造型师测试",
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

  describe("阶段 1: 用户注册和认证", () => {
    it("应该成功注册用户", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/register")
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty("access_token");
      expect(response.body).toHaveProperty("refreshToken");
      expect(response.body.user).toHaveProperty("email", testUser.email);

      accessToken = response.body.access_token;
      refreshToken = response.body.refreshToken;
      userId = response.body.user.id;
    });

    it("应该成功获取快捷建议列表", async () => {
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

    it("应该成功获取风格选项列表", async () => {
      const response = await request(app.getHttpServer())
        .get("/ai-stylist/options/styles")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const option = response.body[0];
      expect(option).toHaveProperty("value");
      expect(option).toHaveProperty("label");
    });

    it("应该成功获取场景选项列表", async () => {
      const response = await request(app.getHttpServer())
        .get("/ai-stylist/options/occasions")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);

      const option = response.body[0];
      expect(option).toHaveProperty("value");
      expect(option).toHaveProperty("label");
    });
  });

  describe("阶段 2: 创建 AI 造型师会话", () => {
    it("应该成功创建带入口消息的会话", async () => {
      const response = await request(app.getHttpServer())
        .post("/ai-stylist/sessions")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(stylistSessionFixtures.interviewSession)
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("status");
      expect(response.body).toHaveProperty("createdAt");

      sessionId = response.body.id;
    });

    it("应该成功创建不带入口消息的会话", async () => {
      const response = await request(app.getHttpServer())
        .post("/ai-stylist/sessions")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({})
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("status");
    });

    it("创建会话响应时间应该符合性能要求", async () => {
      const duration = await measureResponseTime(async () => {
        await request(app.getHttpServer())
          .post("/ai-stylist/sessions")
          .set("Authorization", `Bearer ${accessToken}`)
          .send({})
          .expect(201);
      });

      expect(duration).toBeLessThan(performanceThresholds.aiStylist.createSession);
    });
  });

  describe("阶段 3: 发送消息进行对话", () => {
    it("应该成功发送消息并获取 AI 回复", async () => {
      const response = await request(app.getHttpServer())
        .post(`/ai-stylist/sessions/${sessionId}/messages`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send(stylistMessageFixtures.validMessage)
        .expect(201);

      expect(response.body).toHaveProperty("response");
      expect(typeof response.body.response).toBe("string");
      expect(response.body.response.length).toBeGreaterThan(0);
    });

    it("应该成功发送追问消息", async () => {
      const response = await request(app.getHttpServer())
        .post(`/ai-stylist/sessions/${sessionId}/messages`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          message: "有没有其他颜色选择？我比较喜欢深色系。",
        })
        .expect(201);

      expect(response.body).toHaveProperty("response");
    });

    it("应该成功发送场景限定消息", async () => {
      const response = await request(app.getHttpServer())
        .post(`/ai-stylist/sessions/${sessionId}/messages`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          message: "这是一家互联网公司的技术岗位面试。",
          context: {
            industry: "tech",
            position: "engineer",
          },
        })
        .expect(201);

      expect(response.body).toHaveProperty("response");
    });

    it("空消息应该返回 400", async () => {
      await request(app.getHttpServer())
        .post(`/ai-stylist/sessions/${sessionId}/messages`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ message: "" })
        .expect(400);
    });

    it("消息过长应该返回 400", async () => {
      await request(app.getHttpServer())
        .post(`/ai-stylist/sessions/${sessionId}/messages`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send(stylistMessageFixtures.tooLongMessage)
        .expect(400);
    });

    it("发送消息响应时间应该符合性能要求（含 LLM 调用）", async () => {
      const duration = await measureResponseTime(async () => {
        await request(app.getHttpServer())
          .post(`/ai-stylist/sessions/${sessionId}/messages`)
          .set("Authorization", `Bearer ${accessToken}`)
          .send({ message: "测试消息" })
          .expect(201);
      });

      expect(duration).toBeLessThan(performanceThresholds.aiStylist.sendMessage);
    });
  });

  describe("阶段 4: 获取穿搭推荐", () => {
    it("应该成功生成穿搭方案", async () => {
      const response = await request(app.getHttpServer())
        .post(`/ai-stylist/sessions/${sessionId}/resolve`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(201);

      expect(response.body).toHaveProperty("outfits");
      expect(Array.isArray(response.body.outfits)).toBe(true);

      if (response.body.outfits.length > 0) {
        const outfit = response.body.outfits[0];
        expect(outfit).toHaveProperty("items");
        expect(outfit).toHaveProperty("description");
      }
    });

    it("应该成功获取会话状态", async () => {
      const response = await request(app.getHttpServer())
        .get(`/ai-stylist/sessions/${sessionId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("id", sessionId);
      expect(response.body).toHaveProperty("status");
      expect(response.body).toHaveProperty("messages");
    });

    it("应该成功获取会话列表", async () => {
      const response = await request(app.getHttpServer())
        .get("/ai-stylist/sessions")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("sessions");
      expect(Array.isArray(response.body.sessions)).toBe(true);
      expect(response.body.sessions.length).toBeGreaterThan(0);
    });

    it("应该支持分页获取会话列表", async () => {
      const response = await request(app.getHttpServer())
        .get("/ai-stylist/sessions")
        .query({ limit: 5, offset: 0 })
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.sessions.length).toBeLessThanOrEqual(5);
    });

    it("获取会话列表响应时间应该符合性能要求", async () => {
      const duration = await measureResponseTime(async () => {
        await request(app.getHttpServer())
          .get("/ai-stylist/sessions")
          .set("Authorization", `Bearer ${accessToken}`)
          .expect(200);
      });

      expect(duration).toBeLessThan(performanceThresholds.aiStylist.listSessions);
    });
  });

  describe("阶段 5: 提交反馈", () => {
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
          reason: "风格不合适",
        })
        .expect(201);

      expect(response.body).toHaveProperty("success", true);
    });

    it("应该成功获取会话反馈记录", async () => {
      const response = await request(app.getHttpServer())
        .get(`/ai-stylist/sessions/${sessionId}/feedback`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe("阶段 6: 会话管理", () => {
    let newSessionId: string;

    beforeAll(async () => {
      // 创建新会话用于删除测试
      const response = await request(app.getHttpServer())
        .post("/ai-stylist/sessions")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ entry: "测试删除会话" });
      newSessionId = response.body.id;
    });

    it("应该成功删除会话", async () => {
      await request(app.getHttpServer())
        .delete(`/ai-stylist/sessions/${newSessionId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);
    });

    it("删除不存在的会话应该返回 404", async () => {
      await request(app.getHttpServer())
        .delete("/ai-stylist/sessions/non-existent-id")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(404);
    });

    it("获取不存在的会话应该返回 404", async () => {
      await request(app.getHttpServer())
        .get("/ai-stylist/sessions/non-existent-id")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe("阶段 7: 兼容旧版 API", () => {
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

  describe("异常情况处理", () => {
    it("未认证用户应该无法访问 AI 造型师", async () => {
      await request(app.getHttpServer())
        .get("/ai-stylist/sessions")
        .expect(401);
    });

    it("未认证用户应该无法创建会话", async () => {
      await request(app.getHttpServer())
        .post("/ai-stylist/sessions")
        .send({ entry: "测试" })
        .expect(401);
    });

    it("未认证用户应该无法发送消息", async () => {
      await request(app.getHttpServer())
        .post(`/ai-stylist/sessions/${sessionId}/messages`)
        .send({ message: "测试" })
        .expect(401);
    });

    it("访问其他用户的会话应该返回 404", async () => {
      // 创建另一个用户
      const otherUser = await prisma.user.create({
        data: {
          email: generateTestEmail(),
          password: "hashedpassword",
        },
      });

      // 创建该用户的会话
      const otherSession = await prisma.aiStylistSession.create({
        data: {
          id: `session-${Date.now()}`,
          userId: otherUser.id,
          payload: {},
          expiresAt: new Date(Date.now() + 3600000),
        },
      });

      // 尝试用原用户访问
      await request(app.getHttpServer())
        .get(`/ai-stylist/sessions/${otherSession.id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(404);

      // 清理
      await prisma.aiStylistSession.delete({ where: { id: otherSession.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: otherUser.id } }).catch(() => {});
    });
  });

  describe("完整流程性能测试", () => {
    it("完整 AI 造型师流程应该在合理时间内完成", async () => {
      const startTime = Date.now();

      // 1. 创建会话
      const sessionResponse = await request(app.getHttpServer())
        .post("/ai-stylist/sessions")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ entry: "帮我搭配一套约会穿搭" })
        .expect(201);
      const perfSessionId = sessionResponse.body.id;

      // 2. 发送消息
      await request(app.getHttpServer())
        .post(`/ai-stylist/sessions/${perfSessionId}/messages`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ message: "是晚餐约会，地点在法式餐厅" })
        .expect(201);

      // 3. 生成推荐
      await request(app.getHttpServer())
        .post(`/ai-stylist/sessions/${perfSessionId}/resolve`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(201);

      // 4. 提交反馈
      await request(app.getHttpServer())
        .post(`/ai-stylist/sessions/${perfSessionId}/feedback`)
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ outfitIndex: 0, action: "like" })
        .expect(201);

      const totalDuration = Date.now() - startTime;

      // 完整流程应该在 15 秒内完成（含 LLM 调用）
      expect(totalDuration).toBeLessThan(15000);
    });
  });

  describe("并发测试", () => {
    it("应该支持多个并发会话", async () => {
      const promises = Array.from({ length: 3 }, () =>
        request(app.getHttpServer())
          .post("/ai-stylist/sessions")
          .set("Authorization", `Bearer ${accessToken}`)
          .send({ entry: "并发测试会话" })
      );

      const responses = await Promise.all(promises);

      responses.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty("id");
      });
    });

    it("应该支持同一会话的快速消息发送", async () => {
      // 创建会话
      const sessionResponse = await request(app.getHttpServer())
        .post("/ai-stylist/sessions")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({});
      const concurrentSessionId = sessionResponse.body.id;

      // 快速发送多条消息（顺序执行，避免竞态）
      const messages = ["消息1", "消息2", "消息3"];
      for (const msg of messages) {
        const response = await request(app.getHttpServer())
          .post(`/ai-stylist/sessions/${concurrentSessionId}/messages`)
          .set("Authorization", `Bearer ${accessToken}`)
          .send({ message: msg });
        expect(response.status).toBe(201);
      }
    });
  });
});
