import { ValidationPipe, VersioningType } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule } from "@nestjs/swagger";
import compression from "compression";
import { Request, Response, NextFunction } from "express";
import helmet from "helmet";

import { AppModule } from "./app.module";
import { createSwaggerConfig } from "./config/swagger.config";
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
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "blob:"],
          connectSrc: ["'self'", "ws://localhost:8081"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      crossOriginResourcePolicy: { policy: "same-site" },
      crossOriginOpenerPolicy: { policy: "same-origin" },
      crossOriginEmbedderPolicy: { policy: "require-corp" },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    }),
  );

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
    const config = createSwaggerConfig();

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
    console.log(`🚀 寻裳 API running on: http://localhost:${port}/api`);
    console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  } else {
    console.log(`🚀 寻裳 API running in production mode on port ${port}`);
  }
}

bootstrap();
