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
}

export class DemoPreCacheStatusResponseDto {
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
