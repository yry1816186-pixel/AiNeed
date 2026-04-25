import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, MaxLength, MinLength } from "class-validator";

export class WechatLoginDto {
  @ApiProperty({
    description: "微信 OAuth2.0 授权码",
    example: "071234567890abcdef",
  })
  @IsString({ message: "授权码必须是字符串" })
  @MinLength(1, { message: "授权码不能为空" })
  code!: string;
}

export class MiniProgramLoginDto {
  @ApiProperty({
    description: "微信小程序 wx.login 获取的临时登录凭证 code",
    example: "0a1B2c3D4e5F",
  })
  @IsString({ message: "code 必须是字符串" })
  @IsNotEmpty({ message: "code 不能为空" })
  @MaxLength(128, { message: "code 长度不能超过 128 个字符" })
  code!: string;
}
