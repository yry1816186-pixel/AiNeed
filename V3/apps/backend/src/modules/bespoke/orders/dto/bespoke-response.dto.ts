import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  BESPOKE_ORDER_STATUSES,
  BESPOKE_QUOTE_STATUSES,
} from './bespoke.dto';

export class BespokeOrderResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() studioId!: string;
  @ApiProperty({ enum: BESPOKE_ORDER_STATUSES }) status!: string;
  @ApiPropertyOptional() title?: string;
  @ApiProperty() description!: string;
  @ApiPropertyOptional({ type: [String] }) referenceImages?: string[];
  @ApiPropertyOptional() budgetRange?: string;
  @ApiPropertyOptional() deadline?: string;
  @ApiPropertyOptional() measurements?: Record<string, unknown>;
  @ApiPropertyOptional() assignedStylistId?: string;
  @ApiPropertyOptional() statusHistory?: Array<{
    status: string;
    at: string;
    by: string;
    note?: string;
  }>;
  @ApiPropertyOptional() completedAt?: string;
  @ApiPropertyOptional() cancelledAt?: string;
  @ApiPropertyOptional() cancelReason?: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
  @ApiPropertyOptional() studio?: BespokeStudioBriefDto;
}

export class BespokeStudioBriefDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() logoUrl?: string;
  @ApiPropertyOptional() city?: string;
  @ApiPropertyOptional() specialties?: string[];
  @ApiPropertyOptional() rating?: number;
}

export class BespokeMessageResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() orderId!: string;
  @ApiProperty() senderId!: string;
  @ApiProperty() content!: string;
  @ApiProperty() messageType!: string;
  @ApiPropertyOptional({ type: [String] }) attachments?: string[];
  @ApiProperty() isRead!: boolean;
  @ApiProperty() createdAt!: string;
  @ApiPropertyOptional() sender?: { id: string; nickname?: string; avatarUrl?: string };
}

export class BespokeQuoteResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() orderId!: string;
  @ApiProperty() studioId!: string;
  @ApiProperty() totalPrice!: number;
  @ApiProperty() items!: Array<{
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  @ApiPropertyOptional() estimatedDays?: number;
  @ApiPropertyOptional() validUntil?: string;
  @ApiPropertyOptional() notes?: string;
  @ApiProperty({ enum: BESPOKE_QUOTE_STATUSES }) status!: string;
  @ApiProperty() createdAt!: string;
}

export class BespokeReviewResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() orderId!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() studioId!: string;
  @ApiProperty() rating!: number;
  @ApiPropertyOptional() content?: string;
  @ApiPropertyOptional({ type: [String] }) images?: string[];
  @ApiProperty() isAnonymous!: boolean;
  @ApiProperty() createdAt!: string;
}
