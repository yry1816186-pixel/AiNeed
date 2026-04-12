import { ApiProperty } from '@nestjs/swagger';

class ShippingAddressResponseDto {
  @ApiProperty() name!: string;
  @ApiProperty() phone!: string;
  @ApiProperty() province!: string;
  @ApiProperty() city!: string;
  @ApiProperty() district!: string;
  @ApiProperty() address!: string;
  @ApiProperty({ required: false }) postalCode?: string;
}

class TrackingNodeDto {
  @ApiProperty() time!: string;
  @ApiProperty() description!: string;
  @ApiProperty() location!: string;
}

class TrackingInfoDto {
  @ApiProperty() trackingNumber!: string;
  @ApiProperty() carrier!: string;
  @ApiProperty({ type: [TrackingNodeDto] }) nodes!: TrackingNodeDto[];
}

class OrderTimelineDto {
  @ApiProperty() submittedAt!: string;
  @ApiProperty({ required: false }) paidAt?: string;
  @ApiProperty({ required: false }) producingAt?: string;
  @ApiProperty({ required: false }) shippedAt?: string;
  @ApiProperty({ required: false }) completedAt?: string;
  @ApiProperty({ required: false }) cancelledAt?: string;
}

export class CustomOrderResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() designId!: string;
  @ApiProperty() productType!: string;
  @ApiProperty() material!: string;
  @ApiProperty() size!: string;
  @ApiProperty() quantity!: number;
  @ApiProperty() unitPrice!: number;
  @ApiProperty() totalPrice!: number;
  @ApiProperty() status!: string;
  @ApiProperty({ required: false }) podOrderId?: string;
  @ApiProperty({ required: false }) trackingNumber?: string;
  @ApiProperty() shippingAddress!: ShippingAddressResponseDto;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class CustomOrderDetailResponseDto extends CustomOrderResponseDto {
  @ApiProperty({ type: OrderTimelineDto }) timeline!: OrderTimelineDto;
  @ApiProperty({ required: false }) designName?: string;
  @ApiProperty({ required: false }) designThumbnail?: string;
}

export class CustomOrderListResponseDto {
  @ApiProperty({ type: [CustomOrderResponseDto] }) items!: CustomOrderResponseDto[];
  @ApiProperty() total!: number;
}

export class TrackingResponseDto {
  @ApiProperty() orderId!: string;
  @ApiProperty() status!: string;
  @ApiProperty({ type: TrackingInfoDto }) tracking!: TrackingInfoDto;
}
