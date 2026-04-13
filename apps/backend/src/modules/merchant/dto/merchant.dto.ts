import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  MaxLength,
  IsPhoneNumber,
  IsUrl,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class MerchantApplyDto {
  @ApiProperty({ description: "品牌名称", example: "时尚品牌" })
  @IsString()
  @MinLength(2, { message: "品牌名称至少需要2个字符" })
  @MaxLength(100, { message: "品牌名称不能超过100个字符" })
  brandName!: string;

  @ApiProperty({ description: "商家邮箱", example: "merchant@example.com" })
  @IsEmail({}, { message: "请提供有效的邮箱地址" })
  email!: string;

  @ApiProperty({ description: "登录密码", example: "SecurePass123" })
  @IsString()
  @MinLength(8, { message: "密码至少需要8个字符" })
  @MaxLength(128, { message: "密码不能超过128个字符" })
  password!: string;

  @ApiProperty({ description: "联系人姓名", example: "张三" })
  @IsString()
  @MinLength(2, { message: "联系人姓名至少需要2个字符" })
  @MaxLength(50, { message: "联系人姓名不能超过50个字符" })
  name!: string;

  @ApiPropertyOptional({ description: "联系电话", example: "13800138000" })
  @IsOptional()
  @IsPhoneNumber(undefined, { message: "请提供有效的电话号码" })
  phone?: string;

  @ApiPropertyOptional({ description: "营业执照链接", example: "https://example.com/license.pdf" })
  @IsOptional()
  @IsUrl({}, { message: "请提供有效的营业执照链接" })
  businessLicenseUrl?: string;
}

export class MerchantLoginDto {
  @ApiProperty({ description: "商家邮箱", example: "merchant@example.com" })
  @IsEmail({}, { message: "请提供有效的邮箱地址" })
  email!: string;

  @ApiProperty({ description: "登录密码", example: "SecurePass123" })
  @IsString()
  @MinLength(1, { message: "密码不能为空" })
  password!: string;
}
