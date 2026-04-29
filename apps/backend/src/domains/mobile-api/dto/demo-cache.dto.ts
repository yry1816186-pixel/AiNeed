import { ApiProperty } from "@nestjs/swagger";

export class DemoPreCacheResponseDto {
  @ApiProperty({ description: "预缓存状态", enum: ["success", "partial"] })
  status!: "success" | "partial";

  @ApiProperty({ description: "已缓存的推荐方案数量" })
  recommendations!: number;

  @ApiProperty({ description: "已缓存的TTS短语数量" })
  ttsPhrases!: number;

  @ApiProperty({ description: "已缓存的场景配置数量" })
  sceneConfigs!: number;

  @ApiProperty({ description: "预缓存过程中的错误信息" })
  errors!: string[];

  @ApiProperty({
    description: "是否所有必要缓存键均已就绪，可支持离线演示",
  })
  offlineReady!: boolean;
}

export class DemoPreCacheStatusResponseDto {
  @ApiProperty({ description: "Redis 缓存键总数" })
  redisKeys!: number;

  @ApiProperty({ description: "所有必要缓存键是否均已存在" })
  allRequiredPresent!: boolean;

  @ApiProperty({ description: "缺失的缓存键列表" })
  missingKeys!: string[];

  @ApiProperty({
    description: "各键的剩余TTL（秒）",
    type: "object",
    additionalProperties: { type: "number" },
  })
  ttlRemaining!: Record<string, number>;

  @ApiProperty({ description: "已缓存的推荐方案数量" })
  recommendations!: number;

  @ApiProperty({ description: "已缓存的TTS短语数量" })
  ttsPhrases!: number;

  @ApiProperty({ description: "已缓存的场景配置数量" })
  sceneConfigs!: number;

  @ApiProperty({ description: "缓存总数" })
  total!: number;

  @ApiProperty({ description: "状态" })
  status!: string;
}
