/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum PaymentStatus {
  PENDING = "pending",
  PAID = "paid",
  FAILED = "failed",
  REFUNDED = "refunded",
  CANCELLED = "cancelled",
  CLOSED = "closed",
}

export class PaymentResponseDto {
  @ApiProperty({ description: "是否成功" })
  success!: boolean;

  @ApiProperty({ description: "订单 ID" })
  orderId!: string;

  @ApiPropertyOptional({ description: "第三方交易号" })
  tradeNo?: string;

  @ApiPropertyOptional({ description: "二维码链接（扫码支付）" })
  qrCode?: string;

  @ApiPropertyOptional({ description: "H5 支付链接" })
  h5Url?: string;

  @ApiPropertyOptional({ description: "APP 支付参数" })
  appPayload?: string;

  @ApiPropertyOptional({ description: "过期时间" })
  expireAt?: Date;

  @ApiPropertyOptional({ description: "错误信息" })
  error?: {
    code: string;
    message: string;
    detail?: string;
  };
}

export class PaymentStatusResponseDto {
  @ApiProperty({ description: "订单 ID" })
  orderId!: string;

  @ApiPropertyOptional({ description: "第三方交易号" })
  tradeNo?: string;

  @ApiProperty({ description: "支付金额" })
  amount!: number;

  @ApiProperty({ description: "支付状态", enum: PaymentStatus })
  status!: PaymentStatus;

  @ApiPropertyOptional({ description: "支付时间" })
  paidAt?: Date;
}

export class RefundResponseDto {
  @ApiProperty({ description: "是否成功" })
  success!: boolean;

  @ApiProperty({ description: "退款 ID" })
  refundId!: string;

  @ApiPropertyOptional({ description: "第三方退款号" })
  refundNo?: string;

  @ApiProperty({ description: "退款状态" })
  status!: "processing" | "success" | "failed";

  @ApiPropertyOptional({ description: "错误信息" })
  error?: {
    code: string;
    message: string;
    detail?: string;
  };
}

export class PaymentRecordDto {
  @ApiProperty({ description: "记录 ID" })
  id!: string;

  @ApiProperty({ description: "订单 ID" })
  orderId!: string;

  @ApiProperty({ description: "用户 ID" })
  userId!: string;

  @ApiProperty({ description: "支付提供商" })
  provider!: string;

  @ApiProperty({ description: "支付金额" })
  amount!: number;

  @ApiProperty({ description: "货币" })
  currency!: string;

  @ApiProperty({ description: "支付状态" })
  status!: string;

  @ApiPropertyOptional({ description: "第三方交易号" })
  tradeNo?: string;

  @ApiPropertyOptional({ description: "支付时间" })
  paidAt?: Date;

  @ApiProperty({ description: "创建时间" })
  createdAt!: Date;

  @ApiPropertyOptional({ description: "过期时间" })
  expiredAt?: Date;
}

export class PaymentListResponseDto {
  @ApiProperty({ description: "支付记录列表", type: [PaymentRecordDto] })
  items!: PaymentRecordDto[];

  @ApiProperty({ description: "总数" })
  total!: number;

  @ApiProperty({ description: "当前页" })
  page!: number;

  @ApiProperty({ description: "每页数量" })
  pageSize!: number;
}
