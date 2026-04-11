import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from '../users.service';
import { PrismaService } from '../../../prisma/prisma.service';

const mockUserId = '550e8400-e29b-41d4-a716-446655440000';

const mockUser = {
  id: mockUserId,
  phone: '13800138000',
  email: null,
  passwordHash: null,
  nickname: 'TestUser',
  avatarUrl: null,
  gender: 'male',
  birthYear: 1995,
  height: 175,
  weight: 70,
  bodyType: 'slim',
  colorSeason: 'spring',
  role: 'user',
  language: 'zh',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  bodyProfile: null,
  stylePreferences: [],
};

const mockBodyProfile = {
  id: '660e8400-e29b-41d4-a716-446655440001',
  userId: mockUserId,
  bodyType: 'slim',
  colorSeason: 'spring',
  measurements: { shoulder: 42, chest: 90 },
  analysisResult: { confidence: 0.85 },
  sourceImageUrl: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const mockStylePreference = {
  id: '770e8400-e29b-41d4-a716-446655440002',
  userId: mockUserId,
  styleTags: ['casual', 'streetwear'],
  occasionTags: ['work', 'casual'],
  colorPreferences: ['black', 'white'],
  budgetRange: '500-1000',
  createdAt: new Date('2026-01-01'),
};

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            userStylePreference: {
              findFirst: jest.fn(),
              update: jest.fn(),
              create: jest.fn(),
            },
            bodyProfile: {
              upsert: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProfile', () => {
    it('should return user with bodyProfile and stylePreferences', async () => {
      const userWithRelations = {
        ...mockUser,
        bodyProfile: mockBodyProfile,
        stylePreferences: [mockStylePreference],
      };
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(userWithRelations);

      const result = await service.getProfile(mockUserId);
      expect(result).toEqual(userWithRelations);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUserId },
        include: { bodyProfile: true, stylePreferences: true },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      await expect(service.getProfile('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    it('should update user profile fields', async () => {
      const dto = { nickname: 'NewName', height: 180 };
      const updatedUser = { ...mockUser, ...dto, bodyProfile: null, stylePreferences: [] };
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);
      jest.spyOn(prisma.user, 'update').mockResolvedValue(updatedUser);

      const result = await service.updateProfile(mockUserId, dto);
      expect(result.nickname).toBe('NewName');
      expect(result.height).toBe(180);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { nickname: 'NewName', height: 180 },
        include: { bodyProfile: true, stylePreferences: true },
      });
    });

    it('should only update provided fields', async () => {
      const dto = { nickname: 'OnlyName' };
      const updatedUser = { ...mockUser, nickname: 'OnlyName', bodyProfile: null, stylePreferences: [] };
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);
      jest.spyOn(prisma.user, 'update').mockResolvedValue(updatedUser);

      const result = await service.updateProfile(mockUserId, dto);
      expect(result.nickname).toBe('OnlyName');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { nickname: 'OnlyName' },
        }),
      );
    });

    it('should throw NotFoundException when user not found', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      await expect(
        service.updateProfile('non-existent-id', { nickname: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updatePreferences', () => {
    it('should update existing preference', async () => {
      const dto = { styleTags: ['minimalist'], budgetRange: '1000-3000' };
      const updatedPreference = { ...mockStylePreference, ...dto };
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);
      jest.spyOn(prisma.userStylePreference, 'findFirst').mockResolvedValue(mockStylePreference);
      jest.spyOn(prisma.userStylePreference, 'update').mockResolvedValue(updatedPreference);

      const result = await service.updatePreferences(mockUserId, dto);
      expect(result.styleTags).toEqual(['minimalist']);
      expect(result.budgetRange).toBe('1000-3000');
      expect(prisma.userStylePreference.update).toHaveBeenCalled();
      expect(prisma.userStylePreference.create).not.toHaveBeenCalled();
    });

    it('should create preference when none exists', async () => {
      const dto = { styleTags: ['elegant'], occasionTags: ['formal'] };
      const newPreference = {
        id: 'new-pref-id',
        userId: mockUserId,
        styleTags: ['elegant'],
        occasionTags: ['formal'],
        colorPreferences: [],
        budgetRange: null,
        createdAt: new Date(),
      };
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);
      jest.spyOn(prisma.userStylePreference, 'findFirst').mockResolvedValue(null);
      jest.spyOn(prisma.userStylePreference, 'create').mockResolvedValue(newPreference);

      const result = await service.updatePreferences(mockUserId, dto);
      expect(result.styleTags).toEqual(['elegant']);
      expect(prisma.userStylePreference.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          styleTags: ['elegant'],
          occasionTags: ['formal'],
          colorPreferences: [],
          budgetRange: undefined,
        },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      await expect(
        service.updatePreferences('non-existent-id', { styleTags: ['test'] }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateBodyProfile', () => {
    it('should upsert body profile (update existing)', async () => {
      const dto = { bodyType: 'athletic', measurements: { chest: 95 } };
      const updatedProfile = { ...mockBodyProfile, bodyType: 'athletic', measurements: { chest: 95 } };
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);
      jest.spyOn(prisma.bodyProfile, 'upsert').mockResolvedValue(updatedProfile);

      const result = await service.updateBodyProfile(mockUserId, dto);
      expect(result.bodyType).toBe('athletic');
      expect(prisma.bodyProfile.upsert).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        update: { bodyType: 'athletic', measurements: { chest: 95 } },
        create: {
          userId: mockUserId,
          bodyType: 'athletic',
          colorSeason: undefined,
          measurements: { chest: 95 },
          analysisResult: undefined,
        },
      });
    });

    it('should upsert body profile (create new)', async () => {
      const dto = { bodyType: 'curvy', colorSeason: 'autumn' };
      const newProfile = {
        id: 'new-bp-id',
        userId: mockUserId,
        bodyType: 'curvy',
        colorSeason: 'autumn',
        measurements: null,
        analysisResult: null,
        sourceImageUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);
      jest.spyOn(prisma.bodyProfile, 'upsert').mockResolvedValue(newProfile);

      const result = await service.updateBodyProfile(mockUserId, dto);
      expect(result.bodyType).toBe('curvy');
      expect(result.colorSeason).toBe('autumn');
    });

    it('should throw NotFoundException when user not found', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      await expect(
        service.updateBodyProfile('non-existent-id', { bodyType: 'slim' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateAvatar', () => {
    it('should update avatar URL', async () => {
      const avatarUrl = 'https://cdn.aineed.com/avatars/new.jpg';
      const updatedUser = { ...mockUser, avatarUrl };
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(mockUser);
      jest.spyOn(prisma.user, 'update').mockResolvedValue(updatedUser);

      const result = await service.updateAvatar(mockUserId, avatarUrl);
      expect(result.avatarUrl).toBe(avatarUrl);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { avatarUrl },
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

      await expect(
        service.updateAvatar('non-existent-id', 'https://example.com/img.jpg'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
