import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsIn,
  IsOptional,
  IsObject,
  IsNumber,
  IsUUID,
} from "class-validator";

const BehaviorEventTypeValues = [
  "page_view",
  "item_view",
  "search",
  "filter",
  "click",
  "scroll",
  "try_on_start",
  "try_on_complete",
  "favorite",
  "unfavorite",
  "share",
  "add_to_cart",
  "remove_from_cart",
  "purchase",
  "recommendation_view",
  "recommendation_click",
] as const;
type BehaviorEventType = (typeof BehaviorEventTypeValues)[number];

export class TrackEventDto {
  @ApiPropertyOptional({ description: "用户ID", type: String })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({ description: "会话ID" })
  @IsString()
  sessionId!: string;

  @ApiPropertyOptional({ description: "匿名用户ID" })
  @IsOptional()
  @IsString()
  anonymousId?: string;

  @ApiProperty({ description: "事件类型", enum: BehaviorEventTypeValues })
  @IsIn(BehaviorEventTypeValues)
  eventType!: BehaviorEventType;

  @ApiProperty({ description: "事件分类" })
  @IsString()
  category!: string;

  @ApiProperty({ description: "事件动作" })
  @IsString()
  action!: string;

  @ApiPropertyOptional({ description: "目标类型" })
  @IsOptional()
  @IsString()
  targetType?: string;

  @ApiPropertyOptional({ description: "目标ID" })
  @IsOptional()
  @IsUUID()
  targetId?: string;

  @ApiPropertyOptional({ description: "事件元数据", type: Object })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({ description: "来源" })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: "来源页面" })
  @IsOptional()
  @IsString()
  referrer?: string;

  @ApiPropertyOptional({ description: "设备信息", type: Object })
  @IsOptional()
  @IsObject()
  deviceInfo?: Record<string, any>;

  @ApiPropertyOptional({ description: "持续时间（毫秒）" })
  @IsOptional()
  @IsNumber()
  duration?: number;
}
