/**
 * 用户完整流程集成测试
 * @description 测试用户从注册到完成虚拟试衣的完整业务流程
 * 
 * 测试流程:
 * 1. 用户注册
 * 2. 用户登录
 * 3. 更新用户画像
 * 4. 获取个性化推荐
 * 5. 虚拟试衣
 */

import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import {
  BodyType,
  SkinTone,
  ColorSeason,
  ClothingCategory,
  PhotoType,
  TryOnStatus,
} from "@prisma/client";
import request from "supertest";

import { AppModule } from "../../src/app.module";
import { PrismaService } from "../../src/common/prisma/prisma.service";
import {
  generateTestEmail,
  measureResponseTime,
} from "../utils/test.utils";
import { profileFixtures, performanceThresholds } from "../utils/fixtures";

describe("User Flow E2E - 完整用户流程", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let refreshToken: string;
  let userId: string;
  let photoId: string;
  let itemId: string;
  let tryOnId: string;

  const testUser = {
    email: generateTestEmail(),
    password: "Test123456!",
    nickname: "用户流程测试",
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
      await prisma.virtualTryOn.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.aiStylistSession.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.userPhoto.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.userProfile.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.cartItem.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.favorite.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
    if (itemId) {
      await prisma.clothingItem.delete({ where: { id: itemId } }).catch(() => {});
    }
    await app.close();
  });

  describe("阶段 1: 用户注册", () => {
    it("应该成功注册新用户", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/register")
        .send(testUser)
        .expect(201);

      expect(response.body).toHaveProperty("access_token");
      expect(response.body).toHaveProperty("refreshToken");
      expect(response.body.user).toHaveProperty("email", testUser.email);
      expect(response.body.user).toHaveProperty("nickname", testUser.nickname);

      accessToken = response.body.access_token;
      refreshToken = response.body.refreshToken;
      userId = response.body.user.id;
    });

    it("注册响应时间应该符合性能要求", async () => {
      const duration = await measureResponseTime(async () => {
        await request(app.getHttpServer())
          .post("/auth/register")
          .send({
            email: generateTestEmail(),
            password: "Test123456!",
            nickname: "性能测试用户",
          })
          .expect(201);
      });

      expect(duration).toBeLessThan(performanceThresholds.auth.register);
    });
  });

  describe("阶段 2: 用户登录", () => {
    it("应该成功登录已注册用户", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/login")
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(201);

      expect(response.body).toHaveProperty("access_token");
      expect(response.body).toHaveProperty("refreshToken");

      // 更新 token
      accessToken = response.body.access_token;
      refreshToken = response.body.refreshToken;
    });

    it("应该获取当前用户信息", async () => {
      const response = await request(app.getHttpServer())
        .get("/auth/me")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("id", userId);
      expect(response.body).toHaveProperty("email", testUser.email);
    });

    it("应该能够刷新 Token", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/refresh")
        .send({ refreshToken })
        .expect(201);

      expect(response.body).toHaveProperty("accessToken");
      expect(response.body).toHaveProperty("refreshToken");

      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;
    });
  });

  describe("阶段 3: 更新用户画像", () => {
    it("应该成功获取初始画像（可能为空）", async () => {
      const response = await request(app.getHttpServer())
        .get("/profile")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      // 初始画像可能为空或有默认值
      expect(response.body).toBeDefined();
    });

    it("应该成功更新用户画像", async () => {
      const response = await request(app.getHttpServer())
        .put("/profile")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(profileFixtures.validProfile)
        .expect(200);

      expect(response.body.bodyType).toBe(BodyType.hourglass);
      expect(response.body.skinTone).toBe(SkinTone.medium);
      expect(response.body.colorSeason).toBe(ColorSeason.autumn_warm);
      expect(response.body.height).toBe(165);
      expect(response.body.weight).toBe(55);
    });

    it("应该成功获取体型分析报告", async () => {
      const response = await request(app.getHttpServer())
        .get("/profile/body-analysis")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("bodyType");
      expect(response.body).toHaveProperty("recommendations");
    });

    it("应该成功获取色彩分析报告", async () => {
      const response = await request(app.getHttpServer())
        .get("/profile/color-analysis")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("colorSeason");
      expect(response.body).toHaveProperty("bestColors");
      expect(response.body).toHaveProperty("avoidColors");
    });

    it("应该成功更新风格偏好", async () => {
      const response = await request(app.getHttpServer())
        .put("/profile/preferences/styles")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          styles: ["casual", "minimalist", "elegant"],
        })
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
    });

    it("应该成功更新颜色偏好", async () => {
      const response = await request(app.getHttpServer())
        .put("/profile/preferences/colors")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          colors: ["black", "white", "navy", "beige"],
        })
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
    });
  });

  describe("阶段 4: 获取个性化推荐", () => {
    it("应该成功获取个性化推荐列表", async () => {
      const response = await request(app.getHttpServer())
        .get("/recommendations")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("items");
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    it("应该成功获取风格指南", async () => {
      const response = await request(app.getHttpServer())
        .get("/recommendations/style-guide")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("bodyType");
      expect(response.body).toHaveProperty("colorSeason");
      expect(response.body).toHaveProperty("recommendations");
    });

    it("应该成功获取服装分类列表", async () => {
      const response = await request(app.getHttpServer())
        .get("/clothing/categories")
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it("应该成功获取服装列表", async () => {
      const response = await request(app.getHttpServer())
        .get("/clothing")
        .query({ limit: 5 })
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("items");
      expect(response.body).toHaveProperty("total");

      // 保存第一个商品 ID 供后续测试使用
      if (response.body.items.length > 0) {
        itemId = response.body.items[0].id;
      }
    });

    it("推荐响应时间应该符合性能要求", async () => {
      const duration = await measureResponseTime(async () => {
        await request(app.getHttpServer())
          .get("/recommendations")
          .set("Authorization", `Bearer ${accessToken}`)
          .expect(200);
      });

      expect(duration).toBeLessThan(performanceThresholds.recommendations.list);
    });
  });

  describe("阶段 5: 虚拟试衣", () => {
    beforeAll(async () => {
      // 创建测试用户照片
      const photo = await prisma.userPhoto.create({
        data: {
          userId,
          type: PhotoType.full_body,
          url: "https://example.com/test-photo.jpg",
          thumbnailUrl: "https://example.com/test-photo-thumb.jpg",
        },
      });
      photoId = photo.id;

      // 如果没有商品，创建一个测试商品
      if (!itemId) {
        const item = await prisma.clothingItem.create({
          data: {
            name: "测试T恤",
            category: ClothingCategory.tops,
            images: ["https://example.com/test-item.jpg"],
            price: 199.0,
            colors: ["white", "black"],
            sizes: ["S", "M", "L"],
          },
        });
        itemId = item.id;
      }
    });

    it("应该成功创建试衣请求", async () => {
      const response = await request(app.getHttpServer())
        .post("/try-on")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          photoId,
          itemId,
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("status");
      expect([
        TryOnStatus.pending,
        TryOnStatus.processing,
        TryOnStatus.completed,
      ]).toContain(response.body.status);

      tryOnId = response.body.id;
    });

    it("应该成功获取试衣历史", async () => {
      const response = await request(app.getHttpServer())
        .get("/try-on/history")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("items");
      expect(response.body).toHaveProperty("total");
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    it("应该成功获取试衣状态", async () => {
      const response = await request(app.getHttpServer())
        .get(`/try-on/${tryOnId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("id", tryOnId);
      expect(response.body).toHaveProperty("status");
      expect(response.body).toHaveProperty("photo");
      expect(response.body).toHaveProperty("item");
    });

    it("创建试衣响应时间应该符合性能要求", async () => {
      const duration = await measureResponseTime(async () => {
        await request(app.getHttpServer())
          .post("/try-on")
          .set("Authorization", `Bearer ${accessToken}`)
          .send({ photoId, itemId })
          .expect(201);
      });

      expect(duration).toBeLessThan(performanceThresholds.tryOn.create);
    });
  });

  describe("阶段 6: 用户登出", () => {
    it("应该成功登出", async () => {
      await request(app.getHttpServer())
        .post("/auth/logout")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(201);
    });

    it("登出后 Token 应该失效", async () => {
      await request(app.getHttpServer())
        .get("/auth/me")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(401);
    });
  });

  describe("完整流程性能测试", () => {
    it("完整用户流程应该在合理时间内完成", async () => {
      const startTime = Date.now();

      // 重新注册一个用户进行完整流程测试
      const newUser = {
        email: generateTestEmail(),
        password: "Test123456!",
        nickname: "完整流程测试",
      };

      // 1. 注册
      const registerResponse = await request(app.getHttpServer())
        .post("/auth/register")
        .send(newUser)
        .expect(201);
      const newAccessToken = registerResponse.body.access_token;
      const newUserId = registerResponse.body.user.id;

      // 2. 更新画像
      await request(app.getHttpServer())
        .put("/profile")
        .set("Authorization", `Bearer ${newAccessToken}`)
        .send(profileFixtures.minimalProfile)
        .expect(200);

      // 3. 获取推荐
      await request(app.getHttpServer())
        .get("/recommendations")
        .set("Authorization", `Bearer ${newAccessToken}`)
        .expect(200);

      // 4. 获取服装列表
      await request(app.getHttpServer())
        .get("/clothing")
        .query({ limit: 5 })
        .set("Authorization", `Bearer ${newAccessToken}`)
        .expect(200);

      const totalDuration = Date.now() - startTime;

      // 完整流程应该在 5 秒内完成
      expect(totalDuration).toBeLessThan(5000);

      // 清理
      await prisma.userProfile.deleteMany({ where: { userId: newUserId } }).catch(() => {});
      await prisma.user.delete({ where: { id: newUserId } }).catch(() => {});
    });
  });
});
