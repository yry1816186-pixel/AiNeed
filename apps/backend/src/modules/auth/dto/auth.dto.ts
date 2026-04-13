import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsIn,
  IsNotEmpty,
  IsEnum,
  Length,
  Matches,
  IsDateString,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from "class-validator";

const GenderValues = ["male", "female", "other"] as const;
type Gender = (typeof GenderValues)[number];

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{8,32}$/;
const PASSWORD_ERROR_MSG = "密码必须为8-32位，包含大小写字母和数字";

/**
 * 自定义验证器：密码确认
 */
@ValidatorConstraint({ name: "isPasswordMatch", async: false })
class IsPasswordMatchConstraint implements ValidatorConstraintInterface {
  validate(confirmPassword: string, args: ValidationArguments) {
    const object = args.object as Record<string, unknown>;
    const password = object.password;
    return password === confirmPassword;
  }

  defaultMessage(args: ValidationArguments) {
    return "两次输入的密码不一致";
  }
}

/**
 * 自定义验证器：出生日期范围
 */
@ValidatorConstraint({ name: "isValidBirthDate", async: false })
class IsValidBirthDateConstraint implements ValidatorConstraintInterface {
  validate(value: string) {
    if (!value) return true; // 可选字段
    const date = new Date(value);
    const now = new Date();
    const minAge = new Date(now.getFullYear() - 120, now.getMonth(), now.getDate());
    const maxAge = new Date(now.getFullYear() - 13, now.getMonth(), now.getDate());
    return date >= minAge && date <= maxAge;
  }

  defaultMessage() {
    return "出生日期必须在13-120岁之间";
  }
}

export class RegisterDto {
  @ApiProperty({ 
    example: "user@example.com",
    description: "用户邮箱地址",
    format: "email"
  })
  @IsEmail({}, { message: "请输入有效的邮箱地址" })
  email!: string;

  @ApiProperty({ 
    example: "Password123", 
    minLength: 8, 
    maxLength: 32,
    description: "密码必须为8-32位，包含大小写字母和数字",
    pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[a-zA-Z\\d!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?]{8,32}$"
  })
  @IsString({ message: "密码必须是字符串" })
  @MinLength(8, { message: "密码长度不能少于8位" })
  @MaxLength(32, { message: "密码长度不能超过32位" })
  @Matches(PASSWORD_REGEX, { message: PASSWORD_ERROR_MSG })
  password!: string;

  @ApiPropertyOptional({ 
    example: "Password123",
    description: "确认密码，必须与密码一致"
  })
  @IsOptional()
  @IsString({ message: "确认密码必须是字符串" })
  @Validate(IsPasswordMatchConstraint)
  confirmPassword?: string;

  @ApiPropertyOptional({ 
    example: "张三",
    description: "用户昵称，最长50个字符",
    maxLength: 50
  })
  @IsOptional()
  @IsString({ message: "昵称必须是字符串" })
  @MaxLength(50, { message: "昵称长度不能超过50位" })
  nickname?: string;

  @ApiPropertyOptional({ 
    example: "13800138000",
    description: "中国大陆手机号码",
    pattern: "^1[3-9]\\d{9}$"
  })
  @IsOptional()
  @IsString({ message: "手机号码必须是字符串" })
  @Matches(/^1[3-9]\d{9}$/, { message: "请输入有效的中国大陆手机号码" })
  phone?: string;
}

export class LoginDto {
  @ApiProperty({ 
    example: "user@example.com",
    description: "用户邮箱地址",
    format: "email"
  })
  @IsEmail({}, { message: "请输入有效的邮箱地址" })
  email!: string;

  @ApiProperty({ 
    example: "Password123",
    description: "用户密码"
  })
  @IsString({ message: "密码必须是字符串" })
  @MinLength(1, { message: "密码不能为空" })
  password!: string;
}

export class AuthResponseDto {
  @ApiProperty()
  user!: {
    id: string;
    email: string;
    nickname?: string;
    avatar?: string;
    createdAt: Date;
  };

  @ApiProperty()
  accessToken!: string;

  @ApiProperty({
    description: "兼容旧客户端的 access token 别名",
    required: false,
  })
  token?: string;

  @ApiProperty()
  refreshToken!: string;
}

export class RefreshTokenDto {
  @ApiProperty({ 
    description: "Refresh Token，用于刷新访问令牌",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  })
  @IsString({ message: "Refresh Token 必须是字符串" })
  @MinLength(1, { message: "Refresh Token 不能为空" })
  refreshToken!: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ 
    example: "张三",
    description: "用户昵称",
    maxLength: 50
  })
  @IsOptional()
  @IsString({ message: "昵称必须是字符串" })
  @MaxLength(50, { message: "昵称长度不能超过50位" })
  nickname?: string;

  @ApiPropertyOptional({ 
    enum: GenderValues,
    description: "性别：male-男性，female-女性，other-其他",
    example: "male"
  })
  @IsOptional()
  @IsIn(GenderValues, { message: "性别必须是 male、female 或 other" })
  gender?: Gender;

  @ApiPropertyOptional({ 
    example: "1990-01-01",
    description: "出生日期，ISO 8601 格式",
    format: "date"
  })
  @IsOptional()
  @IsDateString({}, { message: "出生日期必须是有效的 ISO 8601 日期格式" })
  @Validate(IsValidBirthDateConstraint)
  birthDate?: string;
}

// FIX-BL-003: 密码找回DTO (修复时间: 2026-03-19)
export class ForgotPasswordDto {
  @ApiProperty({ 
    example: "user@example.com",
    description: "注册时使用的邮箱地址",
    format: "email"
  })
  @IsEmail({}, { message: "请输入有效的邮箱地址" })
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    description: "密码重置令牌，通过邮件发送",
    example: "a1b2c3d4e5f6g7h8i9j0"
  })
  @IsString({ message: "令牌必须是字符串" })
  @MinLength(1, { message: "令牌不能为空" })
  token!: string;

  @ApiProperty({
    example: "NewPassword123",
    description: "新密码，必须为8-32位，包含大小写字母和数字",
    minLength: 8,
    maxLength: 32,
    pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[a-zA-Z\\d!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?]{8,32}$"
  })
  @IsString({ message: "密码必须是字符串" })
  @MinLength(8, { message: "密码长度不能少于8位" })
  @MaxLength(32, { message: "密码长度不能超过32位" })
  @Matches(PASSWORD_REGEX, { message: PASSWORD_ERROR_MSG })
  newPassword!: string;

  @ApiPropertyOptional({
    example: "NewPassword123",
    description: "确认新密码，必须与新密码一致"
  })
  @IsOptional()
  @IsString({ message: "确认密码必须是字符串" })
  @Validate(IsPasswordMatchConstraint, ["newPassword"])
  confirmNewPassword?: string;
}

export class PhoneLoginDto {
  @ApiProperty({
    example: "13800138000",
    description: "中国大陆手机号码",
    pattern: "^1[3-9]\\d{9}$"
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^1[3-9]\d{9}$/, { message: "Invalid Chinese phone number" })
  phone!: string;

  @ApiProperty({
    example: "123456",
    description: "短信验证码，6位数字",
    minLength: 6,
    maxLength: 6
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code!: string;
}

export class PhoneRegisterDto {
  @ApiProperty({
    example: "13800138000",
    description: "中国大陆手机号码",
    pattern: "^1[3-9]\\d{9}$"
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^1[3-9]\d{9}$/, { message: "Invalid Chinese phone number" })
  phone!: string;

  @ApiProperty({
    example: "123456",
    description: "短信验证码，6位数字",
    minLength: 6,
    maxLength: 6
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code!: string;

  @ApiProperty({
    enum: GenderValues,
    description: "性别，用于个性化推荐",
    example: "male"
  })
  @IsEnum(GenderValues, { message: "Gender is required for personalized recommendations" })
  @IsNotEmpty({ message: "Gender is required for personalized recommendations" })
  gender!: Gender;

  @ApiPropertyOptional({
    example: "1990-01-01",
    description: "出生日期，用于推导年龄段"
  })
  @IsOptional()
  @IsString()
  birthDate?: string;

  @ApiPropertyOptional({
    example: "张三",
    description: "用户昵称",
    minLength: 2,
    maxLength: 20
  })
  @IsString()
  @IsOptional()
  @Length(2, 20)
  nickname?: string;
}
