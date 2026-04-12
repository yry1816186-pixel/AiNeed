import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SendCodeDto } from './dto/send-code.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('send-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '发送短信验证码', description: '向指定手机号发送6位数字验证码，60秒内不可重发' })
  @ApiResponse({ status: 200, description: '验证码发送成功' })
  @ApiResponse({ status: 429, description: '发送过于频繁，请稍后再试' })
  @ApiResponse({ status: 400, description: '手机号格式不正确' })
  async sendCode(@Body() dto: SendCodeDto) {
    return this.authService.sendCode(dto);
  }

  @Post('verify-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '验证码登录/注册', description: '验证短信验证码，自动登录或注册新账号，返回JWT令牌' })
  @ApiResponse({ status: 200, description: '登录/注册成功，返回 accessToken 和 refreshToken' })
  @ApiResponse({ status: 401, description: '验证码错误或已过期' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  async verifyCode(@Body() dto: VerifyCodeDto) {
    return this.authService.verifyCode(dto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '刷新AccessToken', description: '使用refreshToken获取新的accessToken' })
  @ApiResponse({ status: 200, description: '刷新成功，返回新的 accessToken' })
  @ApiResponse({ status: 401, description: 'refreshToken无效或已过期' })
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '登出', description: '使当前用户的refreshToken失效' })
  @ApiResponse({ status: 200, description: '登出成功' })
  @ApiResponse({ status: 401, description: '未认证' })
  async logout(@CurrentUser('id') userId: string) {
    return this.authService.logout(userId);
  }
}
