import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from '../users.controller';
import { UsersService } from '../users.service';
import { NotFoundException } from '@nestjs/common';

const mockUserId = '550e8400-e29b-41d4-a716-446655440000';

const mockUserResponse = {
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

const mockBodyProfileResponse = {
  id: '660e8400-e29b-41d4-a716-446655440001',
  userId: mockUserId,
  bodyType: 'athletic',
  colorSeason: 'spring',
  measurements: { chest: 95 },
  analysisResult: null,
  sourceImageUrl: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

const mockPreferenceResponse = {
  id: '770e8400-e29b-41d4-a716-446655440002',
  userId: mockUserId,
  styleTags: ['minimalist'],
  occasionTags: ['work'],
  colorPreferences: ['black'],
  budgetRange: '1000-3000',
  createdAt: new Date('2026-01-01'),
};

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            getProfile: jest.fn(),
            updateProfile: jest.fn(),
            updatePreferences: jest.fn(),
            updateBodyProfile: jest.fn(),
            updateAvatar: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getProfile', () => {
    it('should return user profile', async () => {
      jest.spyOn(service, 'getProfile').mockResolvedValue(mockUserResponse);

      const result = await controller.getProfile(mockUserId);
      expect(result).toEqual(mockUserResponse);
      expect(service.getProfile).toHaveBeenCalledWith(mockUserId);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      jest.spyOn(service, 'getProfile').mockRejectedValue(new NotFoundException());

      await expect(controller.getProfile('bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update and return user profile', async () => {
      const dto = { nickname: 'UpdatedName' };
      const updatedUser = { ...mockUserResponse, nickname: 'UpdatedName' };
      jest.spyOn(service, 'updateProfile').mockResolvedValue(updatedUser);

      const result = await controller.updateProfile(mockUserId, dto);
      expect(result.nickname).toBe('UpdatedName');
      expect(service.updateProfile).toHaveBeenCalledWith(mockUserId, dto);
    });
  });

  describe('updatePreferences', () => {
    it('should update and return preferences', async () => {
      const dto = { styleTags: ['minimalist'], budgetRange: '1000-3000' };
      jest.spyOn(service, 'updatePreferences').mockResolvedValue(mockPreferenceResponse);

      const result = await controller.updatePreferences(mockUserId, dto);
      expect(result).toEqual(mockPreferenceResponse);
      expect(service.updatePreferences).toHaveBeenCalledWith(mockUserId, dto);
    });
  });

  describe('updateBodyProfile', () => {
    it('should update and return body profile', async () => {
      const dto = { bodyType: 'athletic', measurements: { chest: 95 } };
      jest.spyOn(service, 'updateBodyProfile').mockResolvedValue(mockBodyProfileResponse);

      const result = await controller.updateBodyProfile(mockUserId, dto);
      expect(result).toEqual(mockBodyProfileResponse);
      expect(service.updateBodyProfile).toHaveBeenCalledWith(mockUserId, dto);
    });
  });

  describe('updateAvatar', () => {
    it('should update avatar and return avatar URL', async () => {
      const dto = { avatarUrl: 'https://cdn.aineed.com/avatars/new.jpg' };
      const avatarResult = { avatarUrl: dto.avatarUrl };
      jest.spyOn(service, 'updateAvatar').mockResolvedValue(avatarResult);

      const result = await controller.updateAvatar(mockUserId, dto);
      expect(result.avatarUrl).toBe(dto.avatarUrl);
      expect(service.updateAvatar).toHaveBeenCalledWith(mockUserId, dto.avatarUrl);
    });
  });
});
