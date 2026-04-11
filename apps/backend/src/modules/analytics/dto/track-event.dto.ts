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
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsString()
  sessionId!: string;

  @IsOptional()
  @IsString()
  anonymousId?: string;

  @IsIn(BehaviorEventTypeValues)
  eventType!: BehaviorEventType;

  @IsString()
  category!: string;

  @IsString()
  action!: string;

  @IsOptional()
  @IsString()
  targetType?: string;

  @IsOptional()
  @IsUUID()
  targetId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  referrer?: string;

  @IsOptional()
  @IsObject()
  deviceInfo?: Record<string, any>;

  @IsOptional()
  @IsNumber()
  duration?: number;
}
