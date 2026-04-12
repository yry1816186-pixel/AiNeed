import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtPayload } from '../dto/auth-response.dto';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let prismaService: { user: { findUnique: jest.Mock } };
  let configService: ConfigService;

  beforeEach(async () => {
    prismaService = {
      user: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'JWT_SECRET') return 'test-jwt-secret';
              return null;
            }),
          },
        },
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should call configService.get with JWT_SECRET', () => {
    expect(configService.get).toHaveBeenCalledWith('JWT_SECRET');
  });

  describe('validate', () => {
    const validPayload: JwtPayload = {
      sub: 'user-123',
      phone: '13800138000',
      role: 'user',
      type: 'access',
    };

    const mockUser = {
      id: 'user-123',
      phone: '13800138000',
      nickname: 'TestUser',
      avatarUrl: 'https://example.com/avatar.jpg',
      role: 'user',
    };

    it('should return user when payload type is access and user exists', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await strategy.validate(validPayload);

      expect(result).toEqual(mockUser);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: {
          id: true,
          phone: true,
          nickname: true,
          avatarUrl: true,
          role: true,
        },
      });
    });

    it('should throw UnauthorizedException when payload type is refresh', async () => {
      const refreshPayload: JwtPayload = {
        ...validPayload,
        type: 'refresh',
      };

      await expect(strategy.validate(refreshPayload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(refreshPayload)).rejects.toThrow('\u65e0\u6548\u7684\u8bbf\u95ee\u4ee4\u724c');
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(strategy.validate(validPayload)).rejects.toThrow(UnauthorizedException);
      await expect(strategy.validate(validPayload)).rejects.toThrow('\u7528\u6237\u4e0d\u5b58\u5728');
    });

    it('should throw UnauthorizedException when user is null from database', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(strategy.validate(validPayload)).rejects.toThrow();
    });

    it('should query with correct select fields', async () => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);

      await strategy.validate(validPayload);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: validPayload.sub },
        select: {
          id: true,
          phone: true,
          nickname: true,
          avatarUrl: true,
          role: true,
        },
      });
    });

    it('should handle payload with null phone', async () => {
      const payloadWithNullPhone: JwtPayload = {
        ...validPayload,
        phone: null,
      };
      prismaService.user.findUnique.mockResolvedValue({ ...mockUser, phone: null });

      const result = await strategy.validate(payloadWithNullPhone);
      expect(result.phone).toBeNull();
    });
  });
});
