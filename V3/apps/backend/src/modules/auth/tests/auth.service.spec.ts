import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ISmsProvider } from '../providers/sms-provider.interface';
import { JwtPayload } from '../dto/auth-response.dto';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let redis: { get: jest.Mock; set: jest.Mock; del: jest.Mock };
  let smsProvider: ISmsProvider;

  const mockUser = {
    id: 'user-uuid-1',
    phone: '13800138000',
    nickname: '测试用户',
    avatarUrl: null,
    role: 'user',
  };

  const mockPrismaUser = {
    findUnique: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    redis = {
      get: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
    };

    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: mockPrismaUser,
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const map: Record<string, string> = {
                JWT_SECRET: 'test-secret',
                JWT_ACCESS_EXPIRES_IN: '15m',
                JWT_REFRESH_EXPIRES_IN: '7d',
              };
              return map[key];
            }),
          },
        },
        { provide: 'REDIS_CLIENT', useValue: redis },
        { provide: 'SMS_PROVIDER', useValue: { sendCode: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    smsProvider = module.get<ISmsProvider>('SMS_PROVIDER');
  });

  describe('sendCode', () => {
    it('应成功发送验证码', async () => {
      redis.get.mockResolvedValue(null);

      const result = await service.sendCode({ phone: '13800138000' });

      expect(result).toEqual({ message: '验证码已发送' });
      expect(redis.set).toHaveBeenCalledTimes(2);
      expect(smsProvider.sendCode).toHaveBeenCalledWith(
        '13800138000',
        expect.stringMatching(/^\d{6}$/),
      );
    });

    it('应在60秒限流期内拒绝发送', async () => {
      redis.get.mockResolvedValue('1');

      await expect(service.sendCode({ phone: '13800138000' })).rejects.toThrow(
        new HttpException(
          {
            error: 'RATE_LIMIT_EXCEEDED',
            message: '发送验证码过于频繁，请60秒后再试',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        ),
      );

      expect(redis.set).not.toHaveBeenCalled();
      expect(smsProvider.sendCode).not.toHaveBeenCalled();
    });

    it('应存储验证码到Redis并设置300秒过期', async () => {
      redis.get.mockResolvedValue(null);

      await service.sendCode({ phone: '13800138000' });

      const codeSetCall = redis.set.mock.calls.find(
        (call: unknown[]) => (call[0] as string).startsWith('sms:code:'),
      );
      expect(codeSetCall).toBeDefined();
      expect(codeSetCall![2]).toBe('EX');
      expect(codeSetCall![3]).toBe(300);
    });

    it('应设置限流键并设置60秒过期', async () => {
      redis.get.mockResolvedValue(null);

      await service.sendCode({ phone: '13800138000' });

      const limitSetCall = redis.set.mock.calls.find(
        (call: unknown[]) => (call[0] as string).startsWith('sms:limit:'),
      );
      expect(limitSetCall).toBeDefined();
      expect(limitSetCall![2]).toBe('EX');
      expect(limitSetCall![3]).toBe(60);
    });
  });

  describe('verifyCode', () => {
    it('应验证成功并返回token（已有用户）', async () => {
      redis.get.mockImplementation((key: string) => {
        if (key.startsWith('sms:attempts:')) return Promise.resolve('0');
        return Promise.resolve('123456');
      });
      mockPrismaUser.findUnique.mockResolvedValue(mockUser);

      const result = await service.verifyCode({
        phone: '13800138000',
        code: '123456',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user.id).toBe(mockUser.id);
      expect(redis.del).toHaveBeenCalledWith('sms:code:13800138000');
    });

    it('应自动注册新用户', async () => {
      redis.get.mockImplementation((key: string) => {
        if (key.startsWith('sms:attempts:')) return Promise.resolve('0');
        return Promise.resolve('654321');
      });
      mockPrismaUser.findUnique.mockResolvedValue(null);
      mockPrismaUser.create.mockResolvedValue({
        ...mockUser,
        nickname: '用户5678',
      });

      const result = await service.verifyCode({
        phone: '13800138000',
        code: '654321',
      });

      expect(mockPrismaUser.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          phone: '13800138000',
          nickname: expect.stringMatching(/^用户\d{4}$/),
        }),
      });
      expect(result.user.id).toBe(mockUser.id);
    });

    it('应在验证码错误时抛出异常', async () => {
      redis.get.mockImplementation((key: string) => {
        if (key.startsWith('sms:attempts:')) return Promise.resolve('0');
        return Promise.resolve('999999');
      });

      await expect(
        service.verifyCode({ phone: '13800138000', code: '123456' }),
      ).rejects.toThrow(
        new HttpException(
          {
            error: 'AUTH_INVALID_CREDENTIALS',
            message: '验证码错误或已过期',
          },
          HttpStatus.UNAUTHORIZED,
        ),
      );
    });

    it('应在验证码过期时抛出异常', async () => {
      redis.get.mockImplementation((key: string) => {
        if (key.startsWith('sms:attempts:')) return Promise.resolve('0');
        return Promise.resolve(null);
      });

      await expect(
        service.verifyCode({ phone: '13800138000', code: '123456' }),
      ).rejects.toThrow(
        new HttpException(
          {
            error: 'AUTH_INVALID_CREDENTIALS',
            message: '验证码错误或已过期',
          },
          HttpStatus.UNAUTHORIZED,
        ),
      );
    });
  });

  describe('refreshToken', () => {
    const mockPayload: JwtPayload = {
      sub: 'user-uuid-1',
      phone: '13800138000',
      role: 'user',
      type: 'refresh',
    };

    it('应成功刷新token', async () => {
      (jwtService.verify as jest.Mock).mockReturnValue(mockPayload);
      redis.get.mockResolvedValue('old-refresh-token');
      mockPrismaUser.findUnique.mockResolvedValue(mockUser);

      const result = await service.refreshToken({
        refreshToken: 'old-refresh-token',
      });

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(redis.del).toHaveBeenCalledWith('refresh:user-uuid-1');
      expect(redis.set).toHaveBeenCalledWith(
        'refresh:user-uuid-1',
        expect.any(String),
        'EX',
        7 * 24 * 60 * 60,
      );
    });

    it('应在JWT过期时抛出异常', async () => {
      (jwtService.verify as jest.Mock).mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(
        service.refreshToken({ refreshToken: 'expired-token' }),
      ).rejects.toThrow(
        new HttpException(
          {
            error: 'AUTH_EXPIRED_TOKEN',
            message: '刷新令牌已过期或无效',
          },
          HttpStatus.UNAUTHORIZED,
        ),
      );
    });

    it('应在token类型不是refresh时抛出异常', async () => {
      (jwtService.verify as jest.Mock).mockReturnValue({
        ...mockPayload,
        type: 'access',
      });

      await expect(
        service.refreshToken({ refreshToken: 'access-token' }),
      ).rejects.toThrow(
        new HttpException(
          {
            error: 'AUTH_INVALID_TOKEN',
            message: '无效的刷新令牌',
          },
          HttpStatus.UNAUTHORIZED,
        ),
      );
    });

    it('应在Redis中无匹配token时抛出异常', async () => {
      (jwtService.verify as jest.Mock).mockReturnValue(mockPayload);
      redis.get.mockResolvedValue(null);

      await expect(
        service.refreshToken({ refreshToken: 'some-token' }),
      ).rejects.toThrow(
        new HttpException(
          {
            error: 'AUTH_INVALID_TOKEN',
            message: '刷新令牌已失效',
          },
          HttpStatus.UNAUTHORIZED,
        ),
      );
    });

    it('应在Redis中token不匹配时抛出异常', async () => {
      (jwtService.verify as jest.Mock).mockReturnValue(mockPayload);
      redis.get.mockResolvedValue('different-token');

      await expect(
        service.refreshToken({ refreshToken: 'some-token' }),
      ).rejects.toThrow(
        new HttpException(
          {
            error: 'AUTH_INVALID_TOKEN',
            message: '刷新令牌已失效',
          },
          HttpStatus.UNAUTHORIZED,
        ),
      );
    });

    it('应在用户不存在时抛出异常', async () => {
      (jwtService.verify as jest.Mock).mockReturnValue(mockPayload);
      redis.get.mockResolvedValue('old-refresh-token');
      mockPrismaUser.findUnique.mockResolvedValue(null);

      await expect(
        service.refreshToken({ refreshToken: 'old-refresh-token' }),
      ).rejects.toThrow(
        new HttpException(
          { error: 'USER_NOT_FOUND', message: '用户不存在' },
          HttpStatus.NOT_FOUND,
        ),
      );
    });
  });

  describe('logout', () => {
    it('应成功登出并删除Redis中的refreshToken', async () => {
      const result = await service.logout('user-uuid-1');

      expect(result).toEqual({ message: '已登出' });
      expect(redis.del).toHaveBeenCalledWith('refresh:user-uuid-1');
    });
  });
});
