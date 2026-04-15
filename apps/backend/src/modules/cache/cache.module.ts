import { Global, Module } from "@nestjs/common";

import { CacheInterceptor, CacheEvictInterceptor } from "../../common/cache/cache-decorator";
import { TypedCacheService } from "../../common/cache/typed-cache.service";
import { RedisModule } from "../../common/redis/redis.module";

import { CacheService } from "./cache.service";

@Global()
@Module({
  imports: [RedisModule],
  providers: [CacheService, TypedCacheService, CacheInterceptor, CacheEvictInterceptor],
  exports: [CacheService, TypedCacheService, CacheInterceptor, CacheEvictInterceptor],
})
export class CacheModule {}
