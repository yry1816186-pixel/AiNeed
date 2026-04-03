/**
 * 虚拟试衣 E2E 测试
 * @description 测试虚拟试衣完整流程，包括创建试衣、查询状态、历史记录等
 */

import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PhotoType, ClothingCategory, TryOnStatus } from "@prisma/client";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";

describe("Try-On E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;
  let photoId: string;
  let itemId: string;
  let tryOnId: string;

  const testUser = {
    email: "try-on-test@example.com",
    password: "Test123456!",
    nickname: "Try-On Test User",
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
      await prisma.userPhoto.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.userProfile.deleteMany({ where: { userId } }).catch(() => {});
      await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    }
    if (itemId) {
      await prisma.clothingItem.delete({ where: { id: itemId } }).catch(() => {});
    }
    await app.close();
  });

  describe("测试数据准备", () => {
    it("应该成功注册用户", async () => {
      const response = await request(app.getHttpServer())
        .post("/auth/register")
        .send(testUser)
        .expect(201);

      accessToken = response.body.access_token;
      userId = response.body.user.id;
    });

    it("应该成功创建测试用户照片", async () => {
      const photo = await prisma.userPhoto.create({
        data: {
          userId,
          type: PhotoType.full_body,
          url: "https://example.com/test-photo.jpg",
          thumbnailUrl: "https://example.com/test-photo-thumb.jpg",
        },
      });
      photoId = photo.id;
      expect(photo.id).toBeDefined();
    });

    it("应该成功创建测试服装商品", async () => {
      const item = await prisma.clothingItem.create({
        data: {
          name: "测试T恤",
          category: ClothingCategory.tops,
          images: ["https://example.com/test-item.jpg"],
          price: 199.00,
          colors: ["white", "black"],
          sizes: ["S", "M", "L"],
        },
      });
      itemId = item.id;
      expect(item.id).toBeDefined();
    });
  });

  describe("POST /try-on", () => {
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
      expect([TryOnStatus.pending, TryOnStatus.processing, TryOnStatus.completed]).toContain(
        response.body.status
      );
      tryOnId = response.body.id;
    });

    it("不存在的照片应该返回 404", async () => {
      await request(app.getHttpServer())
        .post("/try-on")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          photoId: "non-existent-photo-id",
          itemId,
        })
        .expect(404);
    });

    it("不存在的商品应该返回 404", async () => {
      await request(app.getHttpServer())
        .post("/try-on")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          photoId,
          itemId: "non-existent-item-id",
        })
        .expect(404);
    });

    it("无效的 UUID 应该返回 400", async () => {
      await request(app.getHttpServer())
        .post("/try-on")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          photoId: "invalid-uuid",
          itemId: "invalid-uuid",
        })
        .expect(400);
    });

    it("未认证用户应该返回 401", async () => {
      await request(app.getHttpServer())
        .post("/try-on")
        .send({ photoId, itemId })
        .expect(401);
    });
  });

  describe("GET /try-on/history", () => {
    it("应该返回用户的试衣历史", async () => {
      const response = await request(app.getHttpServer())
        .get("/try-on/history")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("items");
      expect(response.body).toHaveProperty("page");
      expect(response.body).toHaveProperty("limit");
      expect(response.body).toHaveProperty("total");
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    it("应该支持分页参数", async () => {
      const response = await request(app.getHttpServer())
        .get("/try-on/history")
        .query({ page: 1, limit: 10 })
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(10);
    });

    it("应该支持按状态筛选", async () => {
      const response = await request(app.getHttpServer())
        .get("/try-on/history")
        .query({ status: TryOnStatus.pending })
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("items");
    });

    it("未认证用户应该返回 401", async () => {
      await request(app.getHttpServer())
        .get("/try-on/history")
        .expect(401);
    });
  });

  describe("GET /try-on/:id", () => {
    it("应该返回试衣状态和详情", async () => {
      const response = await request(app.getHttpServer())
        .get(`/try-on/${tryOnId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("id", tryOnId);
      expect(response.body).toHaveProperty("status");
      expect(response.body).toHaveProperty("photo");
      expect(response.body).toHaveProperty("item");
    });

    it("不存在的试衣记录应该返回 404", async () => {
      await request(app.getHttpServer())
        .get("/try-on/non-existent-id")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(404);
    });

    it("未认证用户应该返回 401", async () => {
      await request(app.getHttpServer())
        .get(`/try-on/${tryOnId}`)
        .expect(401);
    });
  });

  describe("GET /try-on/:id/result-image", () => {
    it("完成的试衣应该返回结果图片", async () => {
      // 等待试衣完成或检查状态
      const statusResponse = await request(app.getHttpServer())
        .get(`/try-on/${tryOnId}`)
        .set("Authorization", `Bearer ${accessToken}`);

      if (statusResponse.body.status === TryOnStatus.completed) {
        const response = await request(app.getHttpServer())
          .get(`/try-on/${tryOnId}/result-image`)
          .set("Authorization", `Bearer ${accessToken}`)
          .expect(200);

        expect(response.headers["content-type"]).toMatch(/image/);
      }
    });

    it("未完成的试衣应该返回 404", async () => {
      // 创建一个新的试衣请求
      const newPhoto = await prisma.userPhoto.create({
        data: {
          userId,
          type: PhotoType.full_body,
          url: "https://example.com/test-photo2.jpg",
        },
      });

      const newItem = await prisma.clothingItem.create({
        data: {
          name: "测试T恤2",
          category: ClothingCategory.tops,
          images: ["https://example.com/test-item2.jpg"],
          price: 299.00,
          colors: ["blue"],
          sizes: ["M"],
        },
      });

      const response = await request(app.getHttpServer())
        .post("/try-on")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          photoId: newPhoto.id,
          itemId: newItem.id,
        });

      // 如果状态不是 completed，应该返回 404
      if (response.body.status !== TryOnStatus.completed) {
        await request(app.getHttpServer())
          .get(`/try-on/${response.body.id}/result-image`)
          .set("Authorization", `Bearer ${accessToken}`)
          .expect(404);
      }

      // 清理
      await prisma.virtualTryOn.deleteMany({ where: { photoId: newPhoto.id } }).catch(() => {});
      await prisma.userPhoto.delete({ where: { id: newPhoto.id } }).catch(() => {});
      await prisma.clothingItem.delete({ where: { id: newItem.id } }).catch(() => {});
    });
  });

  describe("DELETE /try-on/:id", () => {
    it("应该成功删除试衣记录", async () => {
      // 先创建一个新的试衣记录用于删除测试
      const newPhoto = await prisma.userPhoto.create({
        data: {
          userId,
          type: PhotoType.full_body,
          url: "https://example.com/test-photo3.jpg",
        },
      });

      const newItem = await prisma.clothingItem.create({
        data: {
          name: "测试T恤3",
          category: ClothingCategory.tops,
          images: ["https://example.com/test-item3.jpg"],
          price: 399.00,
          colors: ["red"],
          sizes: ["L"],
        },
      });

      const createResponse = await request(app.getHttpServer())
        .post("/try-on")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          photoId: newPhoto.id,
          itemId: newItem.id,
        });

      const newTryOnId = createResponse.body.id;

      // 删除试衣记录
      await request(app.getHttpServer())
        .delete(`/try-on/${newTryOnId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(204);

      // 验证已删除
      await request(app.getHttpServer())
        .get(`/try-on/${newTryOnId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(404);

      // 清理
      await prisma.userPhoto.delete({ where: { id: newPhoto.id } }).catch(() => {});
      await prisma.clothingItem.delete({ where: { id: newItem.id } }).catch(() => {});
    });

    it("删除不存在的试衣记录应该返回 404", async () => {
      await request(app.getHttpServer())
        .delete("/try-on/non-existent-id")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(404);
    });

    it("未认证用户应该返回 401", async () => {
      await request(app.getHttpServer())
        .delete(`/try-on/${tryOnId}`)
        .expect(401);
    });
  });

  describe("缓存测试", () => {
    it("重复的试衣请求应该返回缓存结果", async () => {
      // 第一次请求
      const firstResponse = await request(app.getHttpServer())
        .post("/try-on")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          photoId,
          itemId,
        })
        .expect(201);

      // 第二次相同请求
      const secondResponse = await request(app.getHttpServer())
        .post("/try-on")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({
          photoId,
          itemId,
        })
        .expect(201);

      // 如果第一次已完成，第二次应该返回相同 ID
      if (firstResponse.body.status === TryOnStatus.completed) {
        expect(secondResponse.body.id).toBe(firstResponse.body.id);
        expect(secondResponse.body.status).toBe(TryOnStatus.completed);
      }
    });
  });

  describe("性能测试", () => {
    it("创建试衣请求响应时间应该小于 500ms", async () => {
      const start = Date.now();
      await request(app.getHttpServer())
        .post("/try-on")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ photoId, itemId })
        .expect(201);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(500);
    });

    it("获取历史记录响应时间应该小于 300ms", async () => {
      const start = Date.now();
      await request(app.getHttpServer())
        .get("/try-on/history")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(300);
    });

    it("获取试衣状态响应时间应该小于 200ms", async () => {
      const start = Date.now();
      await request(app.getHttpServer())
        .get(`/try-on/${tryOnId}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(200);
    });
  });

  describe("边界情况测试", () => {
    it("其他用户的试衣记录应该无法访问", async () => {
      // 创建另一个用户
      const otherUser = await prisma.user.create({
        data: {
          email: "other-tryon-test@example.com",
          password: "hashedpassword",
        },
      });

      // 创建该用户的照片
      const otherPhoto = await prisma.userPhoto.create({
        data: {
          userId: otherUser.id,
          type: PhotoType.full_body,
          url: "https://example.com/other-photo.jpg",
        },
      });

      // 创建试衣记录
      const otherTryOn = await prisma.virtualTryOn.create({
        data: {
          userId: otherUser.id,
          photoId: otherPhoto.id,
          itemId,
          status: TryOnStatus.pending,
        },
      });

      // 尝试用原用户访问
      await request(app.getHttpServer())
        .get(`/try-on/${otherTryOn.id}`)
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(404);

      // 清理
      await prisma.virtualTryOn.delete({ where: { id: otherTryOn.id } }).catch(() => {});
      await prisma.userPhoto.delete({ where: { id: otherPhoto.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: otherUser.id } }).catch(() => {});
    });
  });
});
