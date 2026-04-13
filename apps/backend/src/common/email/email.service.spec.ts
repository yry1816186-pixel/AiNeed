import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";

import { EmailService, EmailOptions, EmailResult } from "./email.service";

describe("EmailService", () => {
  let service: EmailService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, any> = {
        SMTP_HOST: undefined, // 不配置 SMTP，使用模拟模式
        SMTP_PORT: 587,
        SMTP_USER: undefined,
        SMTP_PASS: undefined,
        SMTP_SECURE: false,
        SMTP_FROM_EMAIL: "noreply@xuno.com",
        SMTP_FROM_NAME: "xuno",
        SMTP_MAX_RETRIES: 3,
        SMTP_RETRY_BASE_DELAY: 100,
        SMTP_RETRY_MAX_DELAY: 1000,
        FRONTEND_URL: "http://localhost:3000",
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get<ConfigService>(ConfigService);

    // 初始化服务
    await service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("初始化", () => {
    it("应该成功初始化服务", () => {
      expect(service).toBeDefined();
    });

    it("在没有 SMTP 配置时应该使用模拟模式", async () => {
      const result = await service.send({
        to: "test@example.com",
        subject: "测试邮件",
        html: "<p>测试内容</p>",
      });
      expect(result.success).toBe(true);
      expect(result.messageId).toContain("sim_");
    });
  });

  describe("基础发送功能", () => {
    it("应该成功发送简单邮件", async () => {
      const options: EmailOptions = {
        to: "test@example.com",
        subject: "测试邮件",
        html: "<p>测试内容</p>",
      };

      const result = await service.send(options);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it("应该支持多个收件人", async () => {
      const options: EmailOptions = {
        to: ["user1@example.com", "user2@example.com"],
        subject: "群发测试",
        html: "<p>测试内容</p>",
      };

      const result = await service.send(options);

      expect(result.success).toBe(true);
    });

    it("应该支持纯文本邮件", async () => {
      const options: EmailOptions = {
        to: "test@example.com",
        subject: "纯文本测试",
        text: "这是纯文本内容",
      };

      const result = await service.send(options);

      expect(result.success).toBe(true);
    });

    it("应该支持附件", async () => {
      const options: EmailOptions = {
        to: "test@example.com",
        subject: "带附件的邮件",
        html: "<p>请查看附件</p>",
        attachments: [
          {
            filename: "test.txt",
            content: Buffer.from("测试附件内容"),
          },
        ],
      };

      const result = await service.send(options);

      expect(result.success).toBe(true);
    });
  });

  describe("便捷方法", () => {
    describe("sendWelcomeEmail", () => {
      it("应该发送欢迎邮件", async () => {
        const result = await service.sendWelcomeEmail(
          "newuser@example.com",
          "新用户",
        );

        expect(result.success).toBe(true);
        expect(result.messageId).toBeDefined();
      });

      it("应该支持没有昵称的欢迎邮件", async () => {
        const result = await service.sendWelcomeEmail("newuser@example.com");

        expect(result.success).toBe(true);
      });
    });

    describe("sendPasswordResetEmail", () => {
      it("应该发送密码重置邮件", async () => {
        const result = await service.sendPasswordResetEmail(
          "user@example.com",
          "reset-token-123",
        );

        expect(result.success).toBe(true);
      });
    });

    describe("sendEmailVerification", () => {
      it("应该发送邮箱验证邮件", async () => {
        const result = await service.sendEmailVerification(
          "user@example.com",
          "verification-token-456",
        );

        expect(result.success).toBe(true);
      });
    });

    describe("sendNotificationEmail", () => {
      it("应该发送通知邮件", async () => {
        const result = await service.sendNotificationEmail(
          "user@example.com",
          "系统通知",
          "<p>这是一条通知</p>",
        );

        expect(result.success).toBe(true);
      });
    });

    describe("sendSubscriptionConfirmationEmail", () => {
      it("应该发送订阅确认邮件", async () => {
        const result = await service.sendSubscriptionConfirmationEmail(
          "subscriber@example.com",
          "专业版",
          99.0,
          new Date("2024-01-01"),
          new Date("2024-12-31"),
        );

        expect(result.success).toBe(true);
      });
    });

    describe("sendOrderConfirmationEmail", () => {
      it("应该发送订单确认邮件", async () => {
        const items = [
          { name: "商品A", quantity: 2, price: 99.0 },
          { name: "商品B", quantity: 1, price: 199.0 },
        ];

        const result = await service.sendOrderConfirmationEmail(
          "buyer@example.com",
          "ORD-2024-001",
          items,
          397.0,
        );

        expect(result.success).toBe(true);
      });
    });

    describe("sendCustomizationUpdateEmail", () => {
      it("应该发送定制服务更新邮件", async () => {
        const result = await service.sendCustomizationUpdateEmail(
          "customer@example.com",
          "CUST-001",
          "processing",
          "您的定制订单正在处理中",
        );

        expect(result.success).toBe(true);
      });
    });
  });

  describe("日志功能", () => {
    it("应该记录邮件发送日志", async () => {
      await service.send({
        to: "test@example.com",
        subject: "测试",
        html: "<p>内容</p>",
      });

      const logs = service.getEmailLogs();
      const firstLog = logs[0];

      expect(logs.length).toBeGreaterThan(0);
      expect(firstLog?.to).toBe("test@example.com");
      expect(firstLog?.subject).toBe("测试");
      expect(firstLog?.success).toBe(true);
    });

    it("应该返回正确的邮件统计", async () => {
      // 发送几封邮件
      await service.send({
        to: "test1@example.com",
        subject: "测试1",
        html: "<p>1</p>",
      });
      await service.send({
        to: "test2@example.com",
        subject: "测试2",
        html: "<p>2</p>",
      });
      await service.send({
        to: "test3@example.com",
        subject: "测试3",
        html: "<p>3</p>",
      });

      const stats = service.getEmailStats();

      expect(stats.total).toBeGreaterThanOrEqual(3);
      expect(stats.success).toBeGreaterThanOrEqual(3);
      expect(stats.successRate).toBe(100);
    });

    it("应该限制日志数量", async () => {
      // 发送超过限制数量的邮件
      for (let i = 0; i < 10; i++) {
        await service.send({
          to: `test${i}@example.com`,
          subject: `测试${i}`,
          html: "<p>内容</p>",
        });
      }

      const logs = service.getEmailLogs(5);

      expect(logs.length).toBe(5);
    });
  });

  describe("重试机制", () => {
    it("应该返回重试次数", async () => {
      const result = await service.send({
        to: "test@example.com",
        subject: "重试测试",
        html: "<p>内容</p>",
      });

      expect(result).toHaveProperty("retryCount");
      expect(result.retryCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe("模板渲染", () => {
    it("应该正确渲染欢迎邮件模板", async () => {
      // 通过发送欢迎邮件间接测试模板
      const result = await service.sendWelcomeEmail(
        "test@example.com",
        "测试用户",
      );

      expect(result.success).toBe(true);
    });

    it("应该正确渲染密码重置模板", async () => {
      const result = await service.sendPasswordResetEmail(
        "test@example.com",
        "token123",
      );

      expect(result.success).toBe(true);
    });

    it("应该正确渲染订阅确认模板", async () => {
      const result = await service.sendSubscriptionConfirmationEmail(
        "test@example.com",
        "高级版",
        199,
        new Date(),
        new Date(),
      );

      expect(result.success).toBe(true);
    });
  });
});

describe("EmailService with real SMTP (integration)", () => {
  // 这些测试需要真实的 SMTP 配置
  // 在 CI/CD 中应该使用 mock 或跳过

  it.skip("应该连接到真实 SMTP 服务器", async () => {
    // 需要配置真实 SMTP 才能运行
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const config: Record<string, string | number> = {
                SMTP_HOST: "smtp.example.com",
                SMTP_PORT: 587,
                SMTP_USER: "user",
                SMTP_PASS: "password",
                SMTP_FROM_EMAIL: "noreply@example.com",
                SMTP_FROM_NAME: "Test",
                FRONTEND_URL: "http://localhost:3000",
              };
              return config[key];
            },
          },
        },
      ],
    }).compile();

    const service = module.get<EmailService>(EmailService);
    await service.onModuleInit();

    // 这里应该验证真实连接
  });
});
