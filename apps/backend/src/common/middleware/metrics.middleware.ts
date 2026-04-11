import {
  Injectable,
  NestMiddleware,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

import { MetricsService } from '../../modules/metrics/metrics.service';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  private readonly logger = new Logger(MetricsMiddleware.name);

  constructor(private readonly metricsService: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const { method, originalUrl } = req;

    // 获取路由路径（移除参数）
    const route = this.getRoutePath(req);

    // 监听响应完成事件
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000; // 转换为秒
      const statusCode = res.statusCode;

      // 记录 HTTP 请求指标
      this.metricsService.recordHttpRequest(method, route, statusCode, duration);

      // 慢请求日志
      if (duration > 2) {
        this.logger.warn(
          `Slow request: ${method} ${route} - ${duration.toFixed(3)}s - ${statusCode}`,
        );
      }
    });

    next();
  }

  /**
   * 获取路由路径，将动态参数替换为占位符
   * 例如: /users/123 -> /users/:id
   */
  private getRoutePath(req: Request): string {
    // 尝试从路由中获取路径模式
    if (req.route?.path) {
      return req.route.path;
    }

    // 如果没有路由信息，使用原始 URL 但移除查询参数
    const url = req.originalUrl || req.url;
    const [path = "/"] = url.split('?');

    // 尝试将数字 ID 替换为 :id
    return path.replace(/\/\d+/g, '/:id');
  }
}
