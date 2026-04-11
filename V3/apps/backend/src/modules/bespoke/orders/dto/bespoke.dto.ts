import {
  IsString,
  IsUUID,
  IsOptional,
  IsArray,
  IsDateString,
  ValidateNested,
  IsInt,
  Min,
  Max,
  ArrayMaxSize,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const BESPOKE_ORDER_STATUSES = [
  'submitted',
  'quoted',
  'paid',
  'in_progress',
  'completed',
  'cancelled',
] as const;

export type BespokeOrderStatus = (typeof BESPOKE_ORDER_STATUSES)[number];

export const BESPOKE_QUOTE_STATUSES = [
  'pending',
  'accepted',
  'rejected',
  'expired',
] as const;

export type BespokeQuoteStatus = (typeof BESPOKE_QUOTE_STATUSES)[number];

export const MESSAGE_TYPES = ['text', 'image', 'file'] as const;
export type MessageType = (typeof MESSAGE_TYPES)[number];

export class CreateBespokeOrderDto {
  @ApiProperty({ description: '工作室ID' })
  @IsUUID()
  studioId!: string;

  @ApiPropertyOptional({ description: '需求标题', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiProperty({ description: '详细需求描述' })
  @IsString()
  description!: string;

  @ApiPropertyOptional({
    description: '参考图片URLs',
    type: [String],
    maxItems: 9,
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(9)
  @IsString({ each: true })
  referenceImages?: string[];

  @ApiPropertyOptional({ description: '预算范围' })
  @IsOptional()
  @IsString()
  budgetRange?: string;

  @ApiPropertyOptional({ description: '期望交付日期' })
  @IsOptional()
  @IsDateString()
  deadline?: string;

  @ApiPropertyOptional({ description: '用户身体数据' })
  @IsOptional()
  measurements?: Record<string, number>;
}

export class SendMessageDto {
  @ApiProperty({ description: '消息内容' })
  @IsString()
  content!: string;

  @ApiPropertyOptional({
    description: '消息类型',
    enum: MESSAGE_TYPES,
    default: 'text',
  })
  @IsOptional()
  @IsString()
  messageType?: MessageType;

  @ApiPropertyOptional({ description: '附件URLs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];
}

export class QuoteItemDto {
  @ApiProperty({ description: '项目名称' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: '项目描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '数量' })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ description: '单价(分)' })
  @IsInt()
  @Min(0)
  unitPrice!: number;

  @ApiProperty({ description: '小计(分)' })
  @IsInt()
  @Min(0)
  subtotal!: number;
}

export class CreateQuoteDto {
  @ApiProperty({ description: '总价(分)' })
  @IsInt()
  @Min(0)
  totalPrice!: number;

  @ApiProperty({ description: '报价明细', type: [QuoteItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items!: QuoteItemDto[];

  @ApiPropertyOptional({ description: '预计工期(天)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedDays?: number;

  @ApiPropertyOptional({ description: '报价有效期' })
  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @ApiPropertyOptional({ description: '补充说明' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateReviewDto {
  @ApiProperty({ description: '评分(1-5)' })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({ description: '评价内容' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: '评价图片URLs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @ApiPropertyOptional({ description: '是否匿名' })
  @IsOptional()
  @IsString()
  isAnonymous?: boolean;
}

export class CancelOrderDto {
  @ApiPropertyOptional({ description: '取消原因' })
  @IsOptional()
  @IsString()
  cancelReason?: string;
}
