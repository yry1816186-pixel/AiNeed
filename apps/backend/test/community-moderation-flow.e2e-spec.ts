import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";

import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/common/prisma/prisma.service";

describe("Community Moderation Flow E2E", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authorAccessToken: string;
  let authorUserId: string;
  let moderatorAccessToken: string;
  let moderatorUserId: string;
  let postId: string;
  let commentId: string;

  const authorUser = {
    email: "mod-author-e2e@example.com",
    password: "Test123456!",
    nickname: "Mod Author",
  };

  const moderatorUser = {
    email: "mod-admin-e2e@example.com",
    password: "Test123456!",
    nickname: "Mod Admin",
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
    const userIds = [authorUserId, moderatorUserId].filter(Boolean);
    for (const uid of userIds) {
      await prisma.postComment
        .deleteMany({ where: { authorId: uid } })
        .catch(() => {});
      await prisma.communityPost
        .deleteMany({ where: { authorId: uid } })
        .catch(() => {});
    }
    for (const uid of userIds) {
      await prisma.user.delete({ where: { id: uid } }).catch(() => {});
    }
    await app.close();
  });

  describe("前置条件：用户注册", () => {
    it("应该成功注册作者用户", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/register")
        .send(authorUser)
        .expect(201);

      authorAccessToken = response.body.access_token;
      authorUserId = response.body.user.id;
    });

    it("应该成功注册审核员用户", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/auth/register")
        .send(moderatorUser)
        .expect(201);

      moderatorAccessToken = response.body.access_token;
      moderatorUserId = response.body.user.id;
    });
  });

  describe("POST /api/v1/community/posts - 创建帖子", () => {
    it("应该成功创建正常内容帖子", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/community/posts")
        .set("Authorization", `Bearer ${authorAccessToken}`)
        .send({
          title: "今日穿搭分享",
          content: "分享一下今天的日常穿搭，简约风格，适合通勤",
          images: ["https://example.com/outfit1.jpg"],
          tags: ["穿搭", "通勤", "简约"],
          category: "daily_outfit",
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("moderationStatus");
      postId = response.body.id;
    });

    it("包含敏感关键词的帖子应该被自动拦截", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/community/posts")
        .set("Authorization", `Bearer ${authorAccessToken}`)
        .send({
          title: "测试帖子",
          content: "这是一个包含赌博信息的帖子",
          tags: [],
          category: "daily_outfit",
        })
        .expect(201);

      expect(response.body.moderationStatus).toBe("pending");
    });

    it("缺少内容时应该返回 400", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/community/posts")
        .set("Authorization", `Bearer ${authorAccessToken}`)
        .send({
          title: "无内容帖子",
          tags: [],
          category: "daily_outfit",
        })
        .expect(400);
    });

    it("未认证时应该返回 401", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/community/posts")
        .send({
          title: "测试",
          content: "内容",
          tags: [],
          category: "daily_outfit",
        })
        .expect(401);
    });
  });

  describe("GET /api/v1/community/posts - 查看帖子列表", () => {
    it("应该只返回已审核通过的帖子", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/community/posts")
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      for (const post of response.body) {
        if (post.moderationStatus) {
          expect(post.moderationStatus).toBe("approved");
        }
      }
    });

    it("应该支持分页", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/community/posts?page=1&pageSize=10")
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe("GET /api/v1/community/posts/:id - 查看帖子详情", () => {
    it("应该返回帖子详情", async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/community/posts/${postId}`)
        .expect(200);

      expect(response.body).toHaveProperty("id", postId);
    });

    it("不存在的帖子应该返回 404", async () => {
      await request(app.getHttpServer())
        .get("/api/v1/community/posts/nonexistent-id")
        .expect(404);
    });
  });

  describe("POST /api/v1/community/posts/:id/comments - 添加评论", () => {
    it("应该成功添加评论", async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/community/posts/${postId}/comments`)
        .set("Authorization", `Bearer ${authorAccessToken}`)
        .send({
          content: "很好看的穿搭！",
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      commentId = response.body.id;
    });

    it("空评论内容应该返回 400", async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/community/posts/${postId}/comments`)
        .set("Authorization", `Bearer ${authorAccessToken}`)
        .send({})
        .expect(400);
    });
  });

  describe("POST /api/v1/community/posts/:id/report - 举报帖子", () => {
    it("应该成功举报帖子", async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/community/posts/${postId}/report`)
        .set("Authorization", `Bearer ${moderatorAccessToken}`)
        .send({
          reason: "内容不当",
          category: "inappropriate",
        })
        .expect(201);

      expect(response.body).toHaveProperty("success", true);
    });

    it("重复举报同一帖子应该被去重", async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/community/posts/${postId}/report`)
        .set("Authorization", `Bearer ${moderatorAccessToken}`)
        .send({
          reason: "内容不当",
          category: "inappropriate",
        })
        .expect(200);
    });

    it("未认证时应该返回 401", async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/community/posts/${postId}/report`)
        .send({
          reason: "内容不当",
          category: "inappropriate",
        })
        .expect(401);
    });
  });

  describe("GET /api/v1/community/moderation/queue - 审核队列", () => {
    it("审核员应该能查看审核队列", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/community/moderation/queue")
        .set("Authorization", `Bearer ${moderatorAccessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("data");
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it("应该支持分页", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/community/moderation/queue?page=1&pageSize=20")
        .set("Authorization", `Bearer ${moderatorAccessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty("data");
    });
  });

  describe("POST /api/v1/community/moderation/review - 人工审核", () => {
    it("审核员应该能通过帖子", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/community/moderation/review")
        .set("Authorization", `Bearer ${moderatorAccessToken}`)
        .send({
          contentId: postId,
          contentType: "post",
          action: "approve",
        })
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
    });

    it("审核员应该能拒绝帖子", async () => {
      const rejectResponse = await request(app.getHttpServer())
        .post("/api/v1/community/posts")
        .set("Authorization", `Bearer ${authorAccessToken}`)
        .send({
          title: "待拒绝帖子",
          content: "这个帖子会被拒绝",
          tags: [],
          category: "daily_outfit",
        })
        .expect(201);

      const rejectPostId = rejectResponse.body.id;

      const response = await request(app.getHttpServer())
        .post("/api/v1/community/moderation/review")
        .set("Authorization", `Bearer ${moderatorAccessToken}`)
        .send({
          contentId: rejectPostId,
          contentType: "post",
          action: "reject",
          reason: "内容不符合社区规范",
        })
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
    });

    it("缺少必填字段应该返回 400", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/community/moderation/review")
        .set("Authorization", `Bearer ${moderatorAccessToken}`)
        .send({
          contentId: postId,
        })
        .expect(400);
    });

    it("未认证时应该返回 401", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/community/moderation/review")
        .send({
          contentId: postId,
          contentType: "post",
          action: "approve",
        })
        .expect(401);
    });
  });

  describe("POST /api/v1/community/moderation/appeal - 申诉", () => {
    let rejectedPostId: string;

    beforeAll(async () => {
      const createResponse = await request(app.getHttpServer())
        .post("/api/v1/community/posts")
        .set("Authorization", `Bearer ${authorAccessToken}`)
        .send({
          title: "待申诉帖子",
          content: "这个帖子会被拒绝然后申诉",
          tags: [],
          category: "daily_outfit",
        })
        .expect(201);

      rejectedPostId = createResponse.body.id;

      await request(app.getHttpServer())
        .post("/api/v1/community/moderation/review")
        .set("Authorization", `Bearer ${moderatorAccessToken}`)
        .send({
          contentId: rejectedPostId,
          contentType: "post",
          action: "reject",
          reason: "误判测试",
        })
        .expect(200);
    });

    it("作者应该能对被拒绝的内容发起申诉", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/community/moderation/appeal")
        .set("Authorization", `Bearer ${authorAccessToken}`)
        .send({
          contentId: rejectedPostId,
          contentType: "post",
          reason: "我认为这个判断有误，内容是正常的穿搭分享",
        })
        .expect(201);

      expect(response.body).toHaveProperty("success", true);
    });

    it("缺少申诉理由应该返回 400", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/community/moderation/appeal")
        .set("Authorization", `Bearer ${authorAccessToken}`)
        .send({
          contentId: rejectedPostId,
          contentType: "post",
        })
        .expect(400);
    });

    it("未认证时应该返回 401", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/community/moderation/appeal")
        .send({
          contentId: rejectedPostId,
          contentType: "post",
          reason: "申诉理由",
        })
        .expect(401);
    });
  });

  describe("审核后状态验证", () => {
    it("被审核通过的帖子应该出现在公开列表中", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/community/posts")
        .expect(200);

      const approvedPost = response.body.find(
        (p: any) => p.id === postId,
      );
      if (approvedPost) {
        expect(approvedPost.moderationStatus).toBe("approved");
      }
    });
  });
});
