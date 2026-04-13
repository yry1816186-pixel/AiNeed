import { ApiProperty } from "@nestjs/swagger";
import { IsString, Matches, MinLength, MaxLength } from "class-validator";

export class SendSmsCodeDto {
  @ApiProperty({
    example: "13800138000",
    description: "中国大陆手机号码",
    pattern: "^1[3-9]\\d{9}$",
  })
  @IsString({ message: "手机号码必须是字符串" })
  @Matches(/^1[3-9]\d{9}$/, { message: "请输入有效的中国大陆手机号码" })
  phone!: string;
}

export class SmsLoginDto {
  @ApiProperty({
    example: "13800138000",
    description: "中国大陆手机号码",
    pattern: "^1[3-9]\\d{9}$",
  })
  @IsString({ message: "手机号码必须是字符串" })
  @Matches(/^1[3-9]\d{9}$/, { message: "请输入有效的中国大陆手机号码" })
  phone!: string;

  @ApiProperty({
    example: "123456",
    description: "6位短信验证码",
    minLength: 6,
    maxLength: 6,
  })
  @IsString({ message: "验证码必须是字符串" })
  @MinLength(6, { message: "验证码长度不能少于6位" })
  @MaxLength(6, { message: "验证码长度不能超过6位" })
  @Matches(/^\d{6}$/, { message: "验证码必须为6位数字" })
  code!: string;
}
