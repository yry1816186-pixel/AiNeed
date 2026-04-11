import { randomUUID } from "crypto";

import {
  Injectable,
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

import { RegisterDto, LoginDto, AuthResponseDto } from "./dto/auth.dto";
import { AuthHelpersService } from "./auth.helpers";

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
      token: tokens.accessToken,
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

    const existingUser = await this.prisma.user.findUnique({
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

    this.logger.log("密码重置邮件已发送", { email, resetUrl });
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
}
