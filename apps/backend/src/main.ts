import { ValidationPipe, VersioningType } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import compression from "compression";
import { Request, Response, NextFunction } from "express";
// @ts-ignore
import helmet from "helmet";

import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters";
import { MetricsMiddleware } from "./common/middleware/metrics.middleware";
import { ErrorHandlerMiddleware } from "./common/middleware/error-handler.middleware";
import { MetricsService } from "./modules/metrics/metrics.service";
import { XssSanitizationPipe } from "./common/pipes/xss-sanitization.pipe";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 获取 MetricsService 实例
  const metricsService = app.get(MetricsService);
  const metricsMiddleware = new MetricsMiddleware(metricsService);

  // 应用全局错误处理中间件（必须在最前面）
  const errorHandlerMiddleware = new ErrorHandlerMiddleware();
  app.use((req: Request, res: Response, next: NextFunction) => {
    errorHandlerMiddleware.use(req, res, next);
  });

  // 应用指标中间件（排除 /metrics 端点）
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (!req.path.includes('/metrics')) {
      metricsMiddleware.use(req, res, next);
    } else {
      next();
    }
  });

  // 安全中间件
  app.use(helmet());

  // 响应压缩
  app.use(
    compression({
      threshold: 1024, // 超过 1KB 的响应才压缩
      level: 6, // 压缩级别 1-9
    }),
  );

  // CORS 配置
  const corsOrigins = process.env.CORS_ORIGINS?.split(",").filter(Boolean) || [];
  app.enableCors({
    origin: corsOrigins.length > 0
      ? corsOrigins
      : (process.env.NODE_ENV === "production"
        ? []
        : ["http://localhost:3000", "http://localhost:3001"]),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "X-CSRF-Token"],
    exposedHeaders: ["X-Total-Count", "X-CSRF-Token"],
    maxAge: 86400,
  });

  // API 版本控制
  app.setGlobalPrefix("api");
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1",
  });

  // 全局验证管道 (XSS防护 + 输入验证)
  app.useGlobalPipes(
    new XssSanitizationPipe(),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 全局异常过滤器
  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger API 文档配置 - 仅在非生产环境启用
  if (process.env.NODE_ENV !== "production") {
    const config = new DocumentBuilder()
      .setTitle("AiNeed API")
      .setDescription("智能私人形象定制与服装设计助手平台 API")
      .setVersion("1.0")
      .addBearerAuth()
      .addTag("auth", "认证相关接口 - 登录、注册、密码重置")
      .addTag("users", "用户管理 - 用户信息、设置")
      .addTag("profile", "形象档案 - 个人形象数据管理")
      .addTag("photos", "照片管理 - 上传、分析用户照片")
      .addTag("clothing", "服装商品 - 服装浏览、搜索")
      .addTag("try-on", "虚拟试衣 - AI 试衣功能")
      .addTag("recommendations", "风格推荐 - 个性化推荐")
      .addTag("customization", "私人定制 - 定制服务")
      .addTag("search", "搜索功能 - 全局搜索")
      .addTag("favorites", "收藏功能 - 收藏管理")
      .addTag("brands", "品牌管理 - 品牌信息")
      .addTag("analytics", "数据分析 - 用户行为分析")
      .addTag("subscription", "订阅管理 - 会员订阅")
      .addTag("notification", "通知系统 - 消息通知")
      .addTag("privacy", "隐私设置 - 隐私管理")
      .addTag("merchant", "商家后台 - 商家管理")
      .addTag("ai-stylist", "AI造型师 - AI 咨询服务")
      .addTag("payment", "支付系统 - 支付、退款")
      .addTag("ai-safety", "AI安全 - 内容审核与过滤")
      .addTag("code-rag", "代码RAG - 代码语义搜索（供云端AI获取项目上下文）")
      .addTag("health", "健康检查 - 系统状态")
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: "list",
      },
    });
  }

  const configService = app.get(ConfigService);
  const port = configService.get<number>("PORT", 3001);

  await app.listen(port);

  if (process.env.NODE_ENV !== "production") {
    console.log(`🚀 AiNeed API running on: http://localhost:${port}/api`);
    console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  } else {
    console.log(`🚀 AiNeed API running in production mode on port ${port}`);
  }
}

bootstrap();
