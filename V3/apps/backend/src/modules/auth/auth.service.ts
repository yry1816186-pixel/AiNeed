import {
  Injectable,
  Inject,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { ISmsProvider } from './providers/sms-provider.interface';
import { SendCodeDto } from './dto/send-code.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import {
  AuthResponseDto,
  SendCodeResponseDto,
  LogoutResponseDto,
  JwtPayload,
  UserInfoDto,
} from './dto/auth-response.dto';

interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: unknown[]): Promise<string | null>;
  del(key: string | string[]): Promise<number>;
}

const SMS_CODE_TTL = 300;
const SMS_LIMIT_TTL = 60;
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject('REDIS_CLIENT') private readonly redis: RedisClient,
    @Inject('SMS_PROVIDER') private readonly smsProvider: ISmsProvider,
  ) {}

  async sendCode(dto: SendCodeDto): Promise<SendCodeResponseDto> {
    const limitKey = `sms:limit:${dto.phone}`;
    const codeKey = `sms:code:${dto.phone}`;

    const isLimited = await this.redis.get(limitKey);
    if (isLimited) {
      throw new HttpException(
        {
          error: 'RATE_LIMIT_EXCEEDED',
          message: '发送验证码过于频繁，请60秒后再试',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = this.generateCode();
    await this.redis.set(codeKey, code, 'EX', SMS_CODE_TTL);
    await this.redis.set(limitKey, '1', 'EX', SMS_LIMIT_TTL);

    await this.smsProvider.sendCode(dto.phone, code);

    this.logger.log(`验证码已发送至 ${dto.phone}`);
    return { message: '验证码已发送' };
  }

  async verifyCode(dto: VerifyCodeDto): Promise<AuthResponseDto> {
    const codeKey = `sms:code:${dto.phone}`;
    const storedCode = await this.redis.get(codeKey);

    if (!storedCode || storedCode !== dto.code) {
      throw new HttpException(
        {
          error: 'AUTH_INVALID_CREDENTIALS',
          message: '验证码错误或已过期',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    await this.redis.del(codeKey);

    const user = await this.findOrCreateUser(dto.phone);
    return this.generateAuthTokens(user);
  }

  async refreshToken(dto: RefreshTokenDto): Promise<AuthResponseDto> {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(dto.refreshToken);
    } catch {
      throw new HttpException(
        {
          error: 'AUTH_EXPIRED_TOKEN',
          message: '刷新令牌已过期或无效',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (payload.type !== 'refresh') {
      throw new HttpException(
        {
          error: 'AUTH_INVALID_TOKEN',
          message: '无效的刷新令牌',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const refreshKey = `refresh:${payload.sub}`;
    const storedToken = await this.redis.get(refreshKey);

    if (!storedToken || storedToken !== dto.refreshToken) {
      throw new HttpException(
        {
          error: 'AUTH_INVALID_TOKEN',
          message: '刷新令牌已失效',
        },
        HttpStatus.UNAUTHORIZED,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new HttpException(
        { error: 'USER_NOT_FOUND', message: '用户不存在' },
        HttpStatus.NOT_FOUND,
      );
    }

    await this.redis.del(refreshKey);

    return this.generateAuthTokens({
      id: user.id,
      phone: user.phone,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      role: user.role,
    });
  }

  async logout(userId: string): Promise<LogoutResponseDto> {
    const refreshKey = `refresh:${userId}`;
    await this.redis.del(refreshKey);
    this.logger.log(`用户 ${userId} 已登出`);
    return { message: '已登出' };
  }

  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private async findOrCreateUser(phone: string): Promise<UserInfoDto> {
    let user = await this.prisma.user.findUnique({ where: { phone } });

    if (!user) {
      const nickname = `用户${Math.floor(1000 + Math.random() * 9000)}`;
      user = await this.prisma.user.create({
        data: { phone, nickname },
      });
      this.logger.log(`新用户注册: ${phone}`);
    }

    return {
      id: user.id,
      phone: user.phone,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      role: user.role,
    };
  }

  private async generateAuthTokens(user: UserInfoDto): Promise<AuthResponseDto> {
    const accessPayload = {
      sub: user.id,
      phone: user.phone,
      role: user.role,
      type: 'access' as const,
    };

    const refreshPayload = {
      sub: user.id,
      phone: user.phone,
      role: user.role,
      type: 'refresh' as const,
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    const refreshKey = `refresh:${user.id}`;
    await this.redis.set(refreshKey, refreshToken, 'EX', REFRESH_TOKEN_TTL);

    return { accessToken, refreshToken, user };
  }
}
