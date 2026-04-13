import { randomUUID, createHash, timingSafeEqual } from "crypto";

import {
  Injectable,
  Inject,
  UnauthorizedException,
  ConflictException,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

import { PrismaService } from "../../common/prisma/prisma.service";
import { RedisService } from "../../common/redis/redis.service";
import { StructuredLoggerService, ContextualLogger } from "../../common/logging/structured-logger.service";
import * as bcrypt from "../../common/security/bcrypt";

import { RegisterDto, LoginDto, AuthResponseDto, PhoneRegisterDto } from "./dto/auth.dto";
import { AuthHelpersService } from "./auth.helpers";
import { SmsService } from "./services/sms.service";
import { ISmsService } from "./services/sms.service";
import { WechatService } from "./services/wechat.service";

/**
 * JWT payload interface for access and refresh tokens.
 * Contains the minimal claims needed for user identification.
 */
export interface JwtPayload {
  sub: string;  // User ID
  email: string;
  jti?: string;
  iat?: number;  // Issued at (auto-added by JWT)
  exp?: number;  // Expiration (auto-added by JWT)
}

@Injectable()
export class AuthService {
  private readonly logger: ContextualLogger;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
    private authHelpersService: AuthHelpersService,
    @Inject("ISmsService") private smsService: ISmsService,
    private readonly smsVerificationService: SmsService,
    private wechatService: WechatService,
    loggingService: StructuredLoggerService,
  ) {
    this.logger = loggingService.createChildLogger(AuthService.name);
  }

  private buildAuthResponse(
    user: {
      id: string;
      email: string;
      nickname?: string | null;
      avatar?: string | null;
      createdAt: Date;
    },
    tokens: { accessToken: string; refreshToken: string },
  ): AuthResponseDto {
    return {
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname ?? undefined,
        avatar: user.avatar ?? undefined,
        createdAt: user.createdAt,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  private async findMatchingRefreshTokens(
    userId: string,
    refreshToken: string,
  ) {
    const storedTokens = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
    });

    const matchedTokens = [];

    for (const stored of storedTokens) {
      const isMatch = await bcrypt.compare(refreshToken, stored.token);
      if (isMatch) {
        matchedTokens.push(stored);
      }
    }

    return matchedTokens;
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    this.logger.log("用户注册请求", { email: dto.email, hasNickname: !!dto.nickname });

    const emailHash = createHash("sha256").update(dto.email.toLowerCase().trim()).digest("hex");

    const existingUser = await this.prisma.user.findUnique({
      where: { emailHash },
    }) || await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      this.logger.warn("注册失败：邮箱已存在", { email: dto.email });
      throw new ConflictException("该邮箱已被注册");
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const [user] = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: dto.email,
          emailHash: createHash("sha256").update(dto.email.toLowerCase().trim()).digest("hex"),
          password: hashedPassword,
          nickname: dto.nickname,
          phone: dto.phone,
        },
      });

      await tx.userProfile.create({
        data: { userId: createdUser.id },
      });

      return [createdUser];
    });

    const tokens = await this.generateTokens(user.id, user.email);

    await this.saveRefreshToken(user.id, tokens.refreshToken);

    this.logger.log("用户注册成功", { userId: user.id, email: user.email });

    return this.buildAuthResponse(user, tokens);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    this.logger.log("用户登录请求", { email: dto.email });

    const user = await this.authHelpersService.validateCredentials(dto.email, dto.password);

    const tokens = await this.generateTokens(user.id, user.email);

    await this.saveRefreshToken(user.id, tokens.refreshToken);

    this.logger.log("用户登录成功", { userId: user.id, email: user.email });

    return this.buildAuthResponse(user, tokens);
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    this.logger.debug("刷新Token请求");

    let payload: JwtPayload;
    try {
      const refreshSecret = this.configService.get<string>("JWT_REFRESH_SECRET");
      if (!refreshSecret) {
        throw new Error("JWT_REFRESH_SECRET environment variable is required. Generate one with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\"");
      }
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: refreshSecret,
      });
    } catch (error) {
      this.logger.warn("刷新Token失败：Token无效", { error: error instanceof Error ? error.message : "Unknown" });
      throw new UnauthorizedException("Invalid refresh token");
    }

    const matchedTokens = await this.findMatchingRefreshTokens(
      payload.sub,
      refreshToken,
    );

    if (matchedTokens.length === 0) {
      this.logger.warn("刷新Token失败：Token已过期或撤销", { userId: payload.sub });
      throw new UnauthorizedException("Refresh token expired or revoked");
    }

    await this.prisma.refreshToken.deleteMany({
      where: {
        id: {
          in: matchedTokens.map((tokenRecord) => tokenRecord.id),
        },
      },
    });

    const tokens = await this.generateTokens(payload.sub, payload.email);

    await this.saveRefreshToken(payload.sub, tokens.refreshToken);

    this.logger.log("Token刷新成功", { userId: payload.sub });

    return tokens;
  }

  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      const matchedTokens = await this.findMatchingRefreshTokens(
        userId,
        refreshToken,
      );

      if (matchedTokens.length === 0) {
        return;
      }

      await this.prisma.refreshToken.deleteMany({
        where: {
          id: {
            in: matchedTokens.map((tokenRecord) => tokenRecord.id),
          },
        },
      });
    } else {
      // 删除该用户的所有 refresh tokens（强制登出所有设备）
      await this.prisma.refreshToken.deleteMany({
        where: { userId },
      });
    }
  }

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nickname: true,
        avatar: true,
        gender: true,
        createdAt: true,
      },
    });
  }

  private async generateTokens(userId: string, email: string): Promise<{ accessToken: string; refreshToken: string }> {
    const accessPayload: JwtPayload = { sub: userId, email };
    const refreshPayload: JwtPayload = { sub: userId, email, jti: randomUUID() };

    const accessSecret = this.configService.get<string>("JWT_SECRET");
    if (!accessSecret) {
      throw new Error("JWT_SECRET environment variable is required. Generate one with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\"");
    }
    const accessExpiresIn = this.configService.get<string>("JWT_ACCESS_EXPIRES_IN", "15m");
    const accessToken = this.jwtService.sign(accessPayload, { secret: accessSecret, expiresIn: accessExpiresIn });

    const refreshSecret = this.configService.get<string>("JWT_REFRESH_SECRET");
    if (!refreshSecret) {
      throw new Error("JWT_REFRESH_SECRET environment variable is required. Generate one with: node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\"");
    }
    const refreshExpiresIn = this.configService.get<string>("JWT_REFRESH_EXPIRES_IN", "7d");
    const refreshToken = this.jwtService.sign(refreshPayload, { secret: refreshSecret, expiresIn: refreshExpiresIn });

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(userId: string, token: string): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const hashedToken = await bcrypt.hash(token, 10);

    await this.prisma.refreshToken.create({
      data: {
        token: hashedToken,
        userId,
        expiresAt,
      },
    });
  }

  // FIX-BL-003: 密码找回功能实现 (修复时间: 2026-03-19)
  async sendPasswordResetEmail(email: string): Promise<void> {
    this.logger.log("密码重置请求", { email });

    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      this.logger.debug("密码重置：用户不存在", { email });
      return;
    }

    const resetToken = randomUUID();
    const resetKey = `auth:password_reset:${resetToken}`;
    const RESET_TOKEN_TTL = 3600;

    await this.redisService.setWithTtl(resetKey, user.id, RESET_TOKEN_TTL);

    const resetUrl = `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token=${resetToken}`;

    this.logger.log("密码重置邮件已发送", { email });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    this.logger.log("重置密码请求", { tokenPrefix: token.substring(0, 8) });

    const resetKey = `auth:password_reset:${token}`;
    const userId = await this.redisService.get(resetKey);

    if (!userId) {
      this.logger.warn("重置密码失败：Token无效或已过期", { tokenPrefix: token.substring(0, 8) });
      throw new BadRequestException("无效或已过期的重置令牌");
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    await this.redisService.del(resetKey);

    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });

    this.logger.log("密码重置成功", { userId });
  }

  async sendSmsCode(phone: string): Promise<void> {
    const throttleKey = `sms:throttle:${phone}`;
    const isThrottled = await this.redisService.exists(throttleKey);
    if (isThrottled) {
      throw new BadRequestException("发送过于频繁，请60秒后再试");
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeKey = `sms:code:${phone}`;

    await this.redisService.setWithTtl(codeKey, code, 300000);
    await this.redisService.setWithTtl(throttleKey, "1", 60000);

    await this.smsService.sendCode(phone, code);

    this.logger.log("短信验证码已发送", { phone });
  }

  async verifySmsCode(phone: string, code: string): Promise<boolean> {
    const attemptsKey = `sms:attempts:${phone}`;
    const attempts = parseInt(await this.redisService.get(attemptsKey) || "0", 10);
    if (attempts >= 5) {
      throw new BadRequestException("验证码尝试次数过多，请重新获取");
    }

    const codeKey = `sms:code:${phone}`;
    const storedCode = await this.redisService.get(codeKey);

    if (!storedCode) {
      return false;
    }

    const a = Buffer.from(storedCode, "utf-8");
    const b = Buffer.from(code, "utf-8");
    const isMatch = a.length === b.length && timingSafeEqual(a, b);

    if (!isMatch) {
      await this.redisService.setWithTtl(attemptsKey, String(attempts + 1), 300000);
      return false;
    }

    await this.redisService.del(codeKey);
    await this.redisService.del(attemptsKey);
    return true;
  }

  async loginWithPhone(phone: string, code: string): Promise<AuthResponseDto> {
    this.logger.log("手机号验证码登录请求", { phone });

    const isValid = await this.verifySmsCode(phone, code);
    if (!isValid) {
      this.logger.warn("手机号登录失败：验证码无效", { phone });
      throw new UnauthorizedException("验证码无效或已过期");
    }

    let user = await this.prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      const [createdUser] = await this.prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email: `${phone}@sms.placeholder`,
            emailHash: createHash("sha256").update(`${phone}@sms.placeholder`.toLowerCase().trim()).digest("hex"),
            password: await bcrypt.hash(randomUUID(), 10),
            phone,
            nickname: `用户${phone.slice(-4)}`,
          },
        });

        await tx.userProfile.create({
          data: { userId: newUser.id },
        });

        return [newUser];
      });
      user = createdUser;
      this.logger.log("手机号新用户自动注册", { userId: user.id, phone });
    }

    const tokens = await this.generateTokens(user.id, user.email);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    this.logger.log("手机号登录成功", { userId: user.id, phone });

    return this.buildAuthResponse(user, tokens);
  }

  async loginWithWechat(code: string): Promise<AuthResponseDto> {
    this.logger.log("微信登录请求");

    const tokenResponse = await this.wechatService.getAccessToken(code);
    const { openid, unionid } = tokenResponse;

    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { wechatOpenId: openid } as any,
          ...(unionid ? [{ wechatUnionId: unionid } as any] : []),
        ],
      },
    });

    if (!user) {
      const wechatUserInfo = await this.wechatService.getUserInfo(
        tokenResponse.access_token,
        openid,
      );

      const [createdUser] = await this.prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email: `wechat_${openid}@placeholder`,
            emailHash: createHash("sha256").update(`wechat_${openid}@placeholder`.toLowerCase().trim()).digest("hex"),
            password: await bcrypt.hash(randomUUID(), 10),
            wechatOpenId: openid,
            ...(unionid ? { wechatUnionId: unionid } : {}),
            nickname: wechatUserInfo.nickname ?? `微信用户${openid.slice(-4)}`,
            avatar: wechatUserInfo.headimgurl ?? null,
          } as any,
        });

        await tx.userProfile.create({
          data: { userId: newUser.id },
        });

        return [newUser];
      });
      user = createdUser;
      this.logger.log("微信新用户自动注册", { userId: user.id, openid });
    }

    const tokens = await this.generateTokens(user.id, user.email);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    this.logger.log("微信登录成功", { userId: user.id, openid });

    return this.buildAuthResponse(user, tokens);
  }

  /**
   * Register a new user with phone number and SMS verification code.
   * Gender is mandatory (enforced by PhoneRegisterDto @IsNotEmpty).
   * Uses SmsService.verifyCode for timing-safe verification from Plan 02.
   */
  async registerWithPhone(dto: PhoneRegisterDto): Promise<AuthResponseDto> {
    this.logger.log("手机号注册请求", { phone: dto.phone });

    const isValid = await this.smsVerificationService.verifyCode(dto.phone, dto.code);
    if (!isValid) {
      this.logger.warn("手机号注册失败：验证码无效", { phone: dto.phone });
      throw new UnauthorizedException("验证码无效或已过期");
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (existingUser) {
      this.logger.warn("手机号注册失败：手机号已存在", { phone: dto.phone });
      throw new ConflictException("该手机号已注册");
    }

    const [user] = await this.prisma.$transaction(async (tx) => {
      const placeholderEmail = `${dto.phone}@sms.placeholder`;
      const createdUser = await tx.user.create({
        data: {
          email: placeholderEmail,
          emailHash: createHash("sha256").update(placeholderEmail.toLowerCase().trim()).digest("hex"),
          password: await bcrypt.hash(randomUUID(), 10),
          phone: dto.phone,
          nickname: dto.nickname ?? `用户${dto.phone.slice(-4)}`,
          gender: dto.gender as any,
          ...(dto.birthDate ? { birthDate: new Date(dto.birthDate) } : {}),
        },
      });

      await tx.userProfile.create({
        data: {
          userId: createdUser.id,
          ...(dto.gender ? { gender: dto.gender as any } : {}),
        },
      });

      return [createdUser];
    });

    const tokens = await this.generateTokens(user.id, user.email);
    await this.saveRefreshToken(user.id, tokens.refreshToken);

    this.logger.log("手机号注册成功", { userId: user.id, phone: dto.phone });

    return this.buildAuthResponse(user, tokens);
  }
}
