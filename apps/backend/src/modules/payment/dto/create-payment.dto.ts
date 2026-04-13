import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  Min,
  Max,
  IsIP,
  Length,
} from "class-validator";

export enum PaymentProvider {
  ALIPAY = "alipay",
  WECHAT = "wechat",
}

export enum PaymentMethod {
  QRCODE = "qrcode",
  H5 = "h5",
  APP = "app",
  NATIVE = "native",
}

export class CreatePaymentDto {
  @ApiProperty({ description: "订单 ID", example: "order_123" })
  @IsString()
  @Length(1, 64)
  orderId!: string;

  @ApiProperty({ description: "支付金额（元）", example: 99.0 })
  @IsNumber()
  @Min(0.01)
  @Max(1000000)
  @Transform(({ value }) => parseFloat(value))
  amount!: number;

  @ApiProperty({
    description: "支付提供商",
    enum: PaymentProvider,
    example: PaymentProvider.ALIPAY,
  })
  @IsEnum(PaymentProvider)
  provider!: PaymentProvider;

  @ApiProperty({
    description: "支付方式",
    enum: PaymentMethod,
    example: PaymentMethod.QRCODE,
  })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiPropertyOptional({
    description: "商品标题",
    example: "寻裳专业版会员 - 月度订阅",
  })
  @IsOptional()
  @IsString()
  @Length(1, 128)
  subject?: string;

  @ApiPropertyOptional({ description: "商品描述", example: "解锁所有专业功能" })
  @IsOptional()
  @IsString()
  @Length(1, 512)
  body?: string;

  @ApiPropertyOptional({ description: "客户端 IP" })
  @IsOptional()
  @IsIP()
  clientIp?: string;

  @ApiPropertyOptional({ description: "支付超时时间（分钟）", default: 30 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1440) // 最长 24 小时
  expireMinutes?: number;
}

export class QueryPaymentDto {
  @ApiProperty({ description: "订单 ID" })
  @IsString()
  orderId!: string;
}

export class RefundPaymentDto {
  @ApiProperty({ description: "原订单 ID" })
  @IsString()
  orderId!: string;

  @ApiProperty({ description: "退款金额（元）" })
  @IsNumber()
  @Min(0.01)
  @Transform(({ value }) => parseFloat(value))
  amount!: number;

  @ApiPropertyOptional({ description: "退款原因" })
  @IsOptional()
  @IsString()
  @Length(1, 256)
  reason?: string;
}

export class ClosePaymentDto {
  @ApiProperty({ description: "订单 ID" })
  @IsString()
  orderId!: string;
}

export class PaymentCallbackDto {
  // 支付宝和微信的回调数据结构不同，使用 PaymentRawCallbackData 类型
  // 实际处理时会在 Controller 中区分
  [key: string]: unknown;
}
