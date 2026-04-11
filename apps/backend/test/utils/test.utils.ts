/**
 * E2E 测试工具函数
 * @description 提供测试常用的辅助函数
 */

import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaClient, ClothingCategory, PhotoType } from "@prisma/client";
import request from "supertest";

import { AppModule } from "../../src/app.module";
import { PrismaService } from "../../src/common/prisma/prisma.service";

/**
 * 创建测试应用实例
 */
export async function createTestApp(): Promise<{
  app: INestApplication;
  prisma: PrismaService;
}> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();

  const prisma = app.get(PrismaService);

  return { app, prisma };
}

/**
 * 关闭测试应用实例
 */
export async function closeTestApp(app: INestApplication): Promise<void> {
  await app.close();
}

/**
 * 注册测试用户并返回访问令牌
 */
export async function registerTestUser(
  app: INestApplication,
  email: string,
  password: string = "Test123456!",
  nickname?: string
): Promise<{ accessToken: string; refreshToken: string; userId: string }> {
  const response = await request(app.getHttpServer())
    .post("/auth/register")
    .send({
      email,
      password,
      nickname: nickname || `Test User ${Date.now()}`,
    })
    .expect(201);

  return {
    accessToken: response.body.access_token,
    refreshToken: response.body.refreshToken,
    userId: response.body.user.id,
  };
}

/**
 * 登录测试用户
 */
export async function loginTestUser(
  app: INestApplication,
  email: string,
  password: string = "Test123456!"
): Promise<{ accessToken: string; refreshToken: string }> {
  const response = await request(app.getHttpServer())
    .post("/auth/login")
    .send({
      email,
      password,
    })
    .expect(201);

  return {
    accessToken: response.body.access_token,
    refreshToken: response.body.refreshToken,
  };
}

/**
 * 清理测试用户及相关数据
 */
export async function cleanupTestUser(
  prisma: PrismaService,
  userId: string
): Promise<void> {
  // 按依赖顺序删除
  await prisma.virtualTryOn.deleteMany({ where: { userId } }).catch(() => {});
  await prisma.aiStylistSession.deleteMany({ where: { userId } }).catch(() => {});
  await prisma.userPhoto.deleteMany({ where: { userId } }).catch(() => {});
  await prisma.userProfile.deleteMany({ where: { userId } }).catch(() => {});
  await prisma.cartItem.deleteMany({ where: { userId } }).catch(() => {});
  await prisma.favorite.deleteMany({ where: { userId } }).catch(() => {});
  await prisma.user.delete({ where: { id: userId } }).catch(() => {});
}

/**
 * 生成唯一测试邮箱
 */
export function generateTestEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
}

/**
 * 等待指定时间
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 轮询直到条件满足或超时
 */
export async function pollUntil(
  fn: () => Promise<boolean>,
  options: { interval?: number; timeout?: number } = {}
): Promise<boolean> {
  const { interval = 1000, timeout = 30000 } = options;
  const start = Date.now();

  while (Date.now() - start < timeout) {
    if (await fn()) {
      return true;
    }
    await sleep(interval);
  }

  return false;
}

/**
 * 测试 API 响应时间
 */
export async function measureResponseTime(
  fn: () => Promise<unknown>
): Promise<number> {
  const start = Date.now();
  await fn();
  return Date.now() - start;
}

/**
 * 创建测试服装商品
 */
export async function createTestClothingItem(
  prisma: PrismaService,
  data?: Partial<{
    name: string;
    category: ClothingCategory;
    images: string[];
    price: number;
  }>
): Promise<{ id: string }> {
  const item = await prisma.clothingItem.create({
    data: {
      name: data?.name || `测试商品 ${Date.now()}`,
      category: data?.category || ClothingCategory.tops,
      images: data?.images || ["https://example.com/test-item.jpg"],
      price: data?.price || 199.0,
      colors: ["white", "black"],
      sizes: ["S", "M", "L"],
    },
  });

  return { id: item.id };
}

/**
 * 创建测试用户照片
 */
export async function createTestUserPhoto(
  prisma: PrismaService,
  userId: string,
  data?: Partial<{
    type: PhotoType;
    url: string;
  }>
): Promise<{ id: string }> {
  const photo = await prisma.userPhoto.create({
    data: {
      userId,
      type: data?.type || PhotoType.full_body,
      url: data?.url || "https://example.com/test-photo.jpg",
    },
  });

  return { id: photo.id };
}

/**
 * 断言响应包含必需字段
 */
export function assertHasFields(
  obj: Record<string, unknown>,
  fields: string[]
): void {
  for (const field of fields) {
    if (!(field in obj)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
}

/**
 * 断言响应是有效的分页结果
 */
export function assertIsPaginated(
  obj: Record<string, unknown>,
  itemKey: string = "items"
): void {
  assertHasFields(obj, [itemKey, "page", "limit", "total"]);
  if (!Array.isArray(obj[itemKey])) {
    throw new Error(`${itemKey} should be an array`);
  }
}
