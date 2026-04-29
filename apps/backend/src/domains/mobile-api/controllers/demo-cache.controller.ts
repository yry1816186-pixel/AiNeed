import { Controller, Post, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";

import { DemoCacheService } from "../services/demo-cache.service";
import { DemoPreCacheResponseDto, DemoPreCacheStatusResponseDto } from "../dto/demo-cache.dto";

@ApiTags("Demo (Mobile)")
@Controller("demo")
export class DemoCacheController {
  constructor(private readonly demoCacheService: DemoCacheService) {}

  @Post("pre-cache")
  @ApiOperation({ summary: "演示预缓存 — 预热推荐、TTS短语和场景配置" })
  @ApiResponse({ status: 201, description: "预缓存成功", type: DemoPreCacheResponseDto })
  @ApiResponse({ status: 200, description: "部分预缓存成功", type: DemoPreCacheResponseDto })
  async preCache(): Promise<DemoPreCacheResponseDto> {
    return this.demoCacheService.preCacheAll();
  }

  @Get("pre-cache/status")
  @ApiOperation({ summary: "查询预缓存状态" })
  @ApiResponse({ status: 200, description: "缓存状态", type: DemoPreCacheStatusResponseDto })
  async getStatus(): Promise<DemoPreCacheStatusResponseDto> {
    return this.demoCacheService.getStatus();
  }
}
