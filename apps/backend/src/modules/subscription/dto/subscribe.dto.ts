import { IsString, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class SubscribeDto {
  @ApiProperty({ description: "会员计划 ID", example: "plan_pro_monthly" })
  @IsString()
  @IsNotEmpty()
  planId!: string;

  @ApiProperty({ description: "支付方式", example: "alipay" })
  @IsString()
  @IsNotEmpty()
  paymentMethod!: string;
}
