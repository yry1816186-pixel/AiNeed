import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { AuthController } from '../auth.controller';
import { AuthService } from '../auth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthResponse = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    user: {
      id: 'user-uuid-1',
      phone: '13800138000',
      nickname: '测试用户',
      avatarUrl: null,
      role: 'user',
    },
  };

  const mockAuthService = {
    sendCode: jest.fn(),
    verifyCode: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        {
          provide: JwtAuthGuard,
          useValue: { canActivate: jest.fn().mockReturnValue(true) },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  describe('sendCode', () => {
    it('应调用service.sendCode并返回结果', async () => {
      mockAuthService.sendCode.mockResolvedValue({ message: '验证码已发送' });

      const result = await controller.sendCode({ phone: '13800138000' });

      expect(service.sendCode).toHaveBeenCalledWith({ phone: '13800138000' });
      expect(result).toEqual({ message: '验证码已发送' });
    });

    it('应传递限流异常', async () => {
      mockAuthService.sendCode.mockRejectedValue(
        new HttpException(
          {
            error: 'RATE_LIMIT_EXCEEDED',
            message: '发送验证码过于频繁，请60秒后再试',
          },
          HttpStatus.TOO_MANY_REQUESTS,
        ),
      );

      await expect(
        controller.sendCode({ phone: '13800138000' }),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('verifyCode', () => {
    it('应调用service.verifyCode并返回认证响应', async () => {
      mockAuthService.verifyCode.mockResolvedValue(mockAuthResponse);

      const result = await controller.verifyCode({
        phone: '13800138000',
        code: '123456',
      });

      expect(service.verifyCode).toHaveBeenCalledWith({
        phone: '13800138000',
        code: '123456',
      });
      expect(result).toEqual(mockAuthResponse);
    });

    it('应传递验证码错误异常', async () => {
      mockAuthService.verifyCode.mockRejectedValue(
        new HttpException(
          {
            error: 'AUTH_INVALID_CREDENTIALS',
            message: '验证码错误或已过期',
          },
          HttpStatus.UNAUTHORIZED,
        ),
      );

      await expect(
        controller.verifyCode({ phone: '13800138000', code: '000000' }),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('refreshToken', () => {
    it('应调用service.refreshToken并返回新的认证响应', async () => {
      mockAuthService.refreshToken.mockResolvedValue({
        ...mockAuthResponse,
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      const result = await controller.refreshToken({
        refreshToken: 'old-refresh-token',
      });

      expect(service.refreshToken).toHaveBeenCalledWith({
        refreshToken: 'old-refresh-token',
      });
      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
    });

    it('应传递token过期异常', async () => {
      mockAuthService.refreshToken.mockRejectedValue(
        new HttpException(
          {
            error: 'AUTH_EXPIRED_TOKEN',
            message: '刷新令牌已过期或无效',
          },
          HttpStatus.UNAUTHORIZED,
        ),
      );

      await expect(
        controller.refreshToken({ refreshToken: 'expired-token' }),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('logout', () => {
    it('应调用service.logout并返回登出消息', async () => {
      mockAuthService.logout.mockResolvedValue({ message: '已登出' });

      const result = await controller.logout('user-uuid-1');

      expect(service.logout).toHaveBeenCalledWith('user-uuid-1');
      expect(result).toEqual({ message: '已登出' });
    });
  });
});
