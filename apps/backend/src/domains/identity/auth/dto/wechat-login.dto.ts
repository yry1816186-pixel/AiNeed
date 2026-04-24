import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class WechatLoginDto {
  @ApiProperty({
    description: "微信 OAuth2.0 授权码",
    example: "071234567890abcdef",
  })
  @IsString({ message: "授权码必须是字符串" })
  @MinLength(1, { message: "授权码不能为空" })
  code!: string;
}
