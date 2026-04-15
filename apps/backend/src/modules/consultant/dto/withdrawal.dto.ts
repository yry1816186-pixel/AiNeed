import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNumber, Min } from "class-validator";

export class RequestWithdrawalDto {
  @ApiProperty({ description: "顾问ID" })
  @IsString()
  consultantId!: string;

  @ApiProperty({ description: "提现金额", example: 500 })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ description: "银行名称", example: "中国工商银行" })
  @IsString()
  bankName!: string;

  @ApiProperty({ description: "银行账号", example: "6222****1234" })
  @IsString()
  bankAccount!: string;

  @ApiProperty({ description: "持卡人姓名", example: "张三" })
  @IsString()
  accountHolder!: string;
}
