import { Global, Module } from "@nestjs/common";

import { RedisModule } from "../../common/redis/redis.module";

import { CacheService } from "./cache.service";

/**
 * Cache Module
 * 提供全局缓存服务
 *
 * 缓存策略说明:
 * - 用户信息: TTL 1小时
 * - 衣柜列表: TTL 5分钟
 * - 穿搭推荐: TTL 10分钟
 */
@Global()
@Module({
  imports: [RedisModule],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
