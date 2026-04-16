/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiBody,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";

import { AuthService } from "./auth.service";
import { Public } from "./decorators/public.decorator";
import {
  RegisterDto,
  LoginDto,
  AuthResponseDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  WechatLoginDto,
  PhoneLoginDto,
  PhoneRegisterDto,
  SendSmsCodeDto,
  SmsLoginDto,
} from "./dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { SmsThrottleGuard } from "./guards/sms-throttle.guard";

interface RequestWithUser {
  user: {
    id: string;
    email: string;
    nickname?: string;
    avatar?: string;
  };
  headers: Record<string, string>;
}

/**
 * 用户认证响应
 */
class UserResponseDto {
  id!: string;
  email!: string;
  nickname?: string;
  avatar?: string;
  createdAt!: Date;
}

/**
 * 令牌刷新响应
 */
class TokenResponseDto {
  accessToken!: string;
  refreshToken!: string;
}

/**
 * 成功响应
 */
class SuccessResponseDto {
  success!: boolean;
}

/**
 * 忘记密码响应
 */
class ForgotPasswordResponseDto {
  success!: boolean;
  message!: string;
}

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private authService: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute for registration
  @Public()
  @Post("register")
  @ApiOperation({
    summary: "用户注册",
    description: "创建新用户账号，返回访问令牌和用户信息。密码必须为8-32位，包含大小写字母和数字。",
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: "注册成功",
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "请求参数错误（邮箱格式错误、密码不符合要求等）",
  })
  @ApiResponse({
    status: 409,
    description: "邮箱已被注册",
  })
  @ApiResponse({
    status: 429,
    description: "请求过于频繁，每分钟最多5次",
  })
  async register(@Body() dto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(dto);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute for login
  @Public()
  @Post("login")
  @ApiOperation({
    summary: "用户登录",
    description: "使用邮箱和密码登录，返回访问令牌和用户信息。",
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: "登录成功",
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "邮箱或密码错误",
  })
  @ApiResponse({
    status: 429,
    description: "请求过于频繁，每分钟最多5次",
  })
  async login(@Body() dto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(dto);
  }

  /**
   * @deprecated 请使用 POST /auth/wechat 替代，该端点将在未来版本移除
   */
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Public()
  @Post("wechat/login")
  @ApiOperation({
    summary: "微信一键登录 (已废弃，请使用 /auth/wechat)",
    description: "使用微信 OAuth2.0 授权码登录，未注册用户将自动注册。",
    deprecated: true,
  })
  @ApiResponse({
    status: 200,
    description: "登录成功",
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "微信授权失败",
  })
  @ApiResponse({
    status: 429,
    description: "请求过于频繁",
  })
  async loginWithWechat(
    @Body() dto: WechatLoginDto,
  ): Promise<AuthResponseDto> {
    return this.authService.loginWithWechat(dto.code);
  }

  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute for refresh
  @Public()
  @Post("refresh")
  @ApiOperation({
    summary: "刷新访问令牌",
    description: "使用 Refresh Token 获取新的 Access Token 和 Refresh Token。",
  })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: 200,
    description: "刷新成功",
    type: TokenResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Refresh Token 无效或已过期",
  })
  @ApiResponse({
    status: 429,
    description: "请求过于频繁，每分钟最多10次",
  })
  async refreshToken(
    @Body() dto: RefreshTokenDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "用户登出",
    description: "注销当前用户会话，可选传入 Refresh Token 使其失效。",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        refreshToken: {
          type: "string",
          description: "可选，使指定的 Refresh Token 失效",
        },
      },
    },
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: "登出成功",
    type: SuccessResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  async logout(
    @Request() req: RequestWithUser,
    @Body() dto?: RefreshTokenDto,
  ): Promise<{ success: boolean }> {
    const authHeader = req.headers["authorization"];
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : undefined;
    await this.authService.logout(req.user.id, dto?.refreshToken, accessToken);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Get("me")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "获取当前用户信息",
    description: "获取当前登录用户的基本信息，包括 ID、邮箱、昵称和头像。",
  })
  @ApiResponse({
    status: 200,
    description: "获取成功",
    type: UserResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "未授权，需要提供有效的 Access Token",
  })
  async getCurrentUser(@Request() req: RequestWithUser) {
    return req.user;
  }

  // FIX-BL-003: 密码找回功能 (修复时间: 2026-03-19)
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute
  @Public()
  @Post("forgot-password")
  @ApiOperation({
    summary: "忘记密码 - 发送重置邮件",
    description:
      "向指定邮箱发送密码重置链接。无论邮箱是否已注册，都返回相同响应以防止邮箱枚举攻击。",
  })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: "请求已处理",
    type: ForgotPasswordResponseDto,
  })
  @ApiResponse({
    status: 429,
    description: "请求过于频繁，每分钟最多3次",
  })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    await this.authService.sendPasswordResetEmail(dto.email);
    return {
      success: true,
      message: "如果该邮箱已注册，您将收到密码重置邮件",
    };
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @Public()
  @Post("reset-password")
  @ApiOperation({
    summary: "重置密码",
    description:
      "使用邮件中的重置令牌设置新密码。新密码必须为8-32位，包含大小写字母和数字。",
  })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: "密码重置成功",
    type: SuccessResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "重置令牌无效或已过期，或密码不符合要求",
  })
  @ApiResponse({
    status: 429,
    description: "请求过于频繁，每分钟最多5次",
  })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<{ success: boolean }> {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { success: true };
  }

  /**
   * @deprecated 请使用 POST /auth/send-code 替代，该端点将在未来版本移除
   */
  @UseGuards(SmsThrottleGuard)
  @Throttle({ default: { limit: 1, ttl: 60000 } })
  @Public()
  @Post("sms/send")
  @ApiOperation({
    summary: "发送短信验证码 (已废弃，请使用 /auth/send-code)",
    description: "向指定手机号发送6位数字验证码，同一手机号60秒内只能发送一次。",
    deprecated: true,
  })
  @ApiResponse({
    status: 200,
    description: "验证码已发送",
    type: SuccessResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "手机号格式错误或发送过于频繁",
  })
  @ApiResponse({
    status: 429,
    description: "请求过于频繁",
  })
  async sendSmsCode(
    @Body() dto: SendSmsCodeDto,
  ): Promise<{ success: boolean; message: string }> {
    await this.authService.sendSmsCode(dto.phone);
    return { success: true, message: "验证码已发送" };
  }

  /**
   * @deprecated 请使用 POST /auth/phone-login 替代，该端点将在未来版本移除
   */
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Public()
  @Post("sms/login")
  @ApiOperation({
    summary: "手机号验证码登录 (已废弃，请使用 /auth/phone-login)",
    description: "使用手机号和短信验证码登录，未注册手机号将自动注册。",
    deprecated: true,
  })
  @ApiResponse({
    status: 200,
    description: "登录成功",
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "验证码无效或已过期",
  })
  @ApiResponse({
    status: 429,
    description: "请求过于频繁",
  })
  async loginWithPhone(
    @Body() dto: SmsLoginDto,
  ): Promise<AuthResponseDto> {
    return this.authService.loginWithPhone(dto.phone, dto.code);
  }

  // ========== Plan 03: New phone/WeChat endpoints with @Public() decorator ==========

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post("phone-login")
  @ApiOperation({
    summary: "手机号验证码登录 (Plan 03)",
    description: "使用手机号和短信验证码登录。未注册手机号将自动注册。",
  })
  @ApiResponse({ status: 200, description: "登录成功", type: AuthResponseDto })
  @ApiResponse({ status: 401, description: "验证码无效或已过期" })
  @ApiResponse({ status: 429, description: "请求过于频繁" })
  async phoneLogin(
    @Body() dto: PhoneLoginDto,
  ): Promise<AuthResponseDto> {
    return this.authService.loginWithPhone(dto.phone, dto.code);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post("phone-register")
  @ApiOperation({
    summary: "手机号注册 (Plan 03)",
    description: "使用手机号和短信验证码注册新用户。性别为必填字段。",
  })
  @ApiResponse({ status: 201, description: "注册成功", type: AuthResponseDto })
  @ApiResponse({ status: 400, description: "参数错误" })
  @ApiResponse({ status: 401, description: "验证码无效或已过期" })
  @ApiResponse({ status: 409, description: "手机号已注册" })
  @ApiResponse({ status: 429, description: "请求过于频繁" })
  async phoneRegister(
    @Body() dto: PhoneRegisterDto,
  ): Promise<AuthResponseDto> {
    return this.authService.registerWithPhone(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post("wechat")
  @ApiOperation({
    summary: "微信一键登录 (Plan 03)",
    description: "使用微信 OAuth2.0 授权码登录。未注册用户将自动注册。",
  })
  @ApiResponse({ status: 200, description: "登录成功", type: AuthResponseDto })
  @ApiResponse({ status: 401, description: "微信授权失败" })
  @ApiResponse({ status: 429, description: "请求过于频繁" })
  async wechatLogin(
    @Body() dto: WechatLoginDto,
  ): Promise<AuthResponseDto> {
    return this.authService.loginWithWechat(dto.code);
  }

  @Public()
  @Throttle({ default: { limit: 1, ttl: 60000 } })
  @Post("send-code")
  @ApiOperation({
    summary: "发送短信验证码 (Plan 03)",
    description: "向指定手机号发送6位数字验证码，同一手机号60秒内只能发送一次。",
  })
  @ApiResponse({ status: 200, description: "验证码已发送" })
  @ApiResponse({ status: 400, description: "手机号格式错误或发送过于频繁" })
  @ApiResponse({ status: 429, description: "请求过于频繁" })
  async sendCode(
    @Body() dto: SendSmsCodeDto,
  ): Promise<{ success: boolean; message: string }> {
    await this.authService.sendSmsCode(dto.phone);
    return { success: true, message: "验证码已发送" };
  }
}
