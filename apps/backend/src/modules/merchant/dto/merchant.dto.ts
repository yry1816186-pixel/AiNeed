import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  MaxLength,
  IsPhoneNumber,
  IsUrl,
} from "class-validator";

export class MerchantApplyDto {
  @IsString()
  @MinLength(2, { message: "品牌名称至少需要2个字符" })
  @MaxLength(100, { message: "品牌名称不能超过100个字符" })
  brandName!: string;

  @IsEmail({}, { message: "请提供有效的邮箱地址" })
  email!: string;

  @IsString()
  @MinLength(8, { message: "密码至少需要8个字符" })
  @MaxLength(128, { message: "密码不能超过128个字符" })
  password!: string;

  @IsString()
  @MinLength(2, { message: "联系人姓名至少需要2个字符" })
  @MaxLength(50, { message: "联系人姓名不能超过50个字符" })
  name!: string;

  @IsOptional()
  @IsPhoneNumber(undefined, { message: "请提供有效的电话号码" })
  phone?: string;

  @IsOptional()
  @IsUrl({}, { message: "请提供有效的营业执照链接" })
  businessLicenseUrl?: string;
}

export class MerchantLoginDto {
  @IsEmail({}, { message: "请提供有效的邮箱地址" })
  email!: string;

  @IsString()
  @MinLength(1, { message: "密码不能为空" })
  password!: string;
}
