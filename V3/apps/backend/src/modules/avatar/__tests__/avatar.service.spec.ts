import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AvatarService } from '../avatar.service';
import { PrismaService } from '../../../prisma/prisma.service';

const MOCK_TEMPLATE = {
  id: 'template-uuid-1',
  name: '默认女性模板',
  gender: 'female',
  thumbnailUrl: 'https://cdn.example.com/template1.png',
  drawingConfig: {},
  parameters: {
    faceShape: { min: 0, max: 100, default: 50, label: '脸型' },
    eyeShape: { options: ['round', 'almond', 'cat'], default: 'round', label: '眼型' },
    skinTone: { options: ['#FFDBB4', '#E8B98D', '#C68642'], default: '#FFDBB4', label: '肤色' },
    hairStyle: {
      options: [
        { id: 'short', name: '短发', thumbnailUrl: 'https://cdn.example.com/hair/short.png' },
        { id: 'long', name: '长发', thumbnailUrl: 'https://cdn.example.com/hair/long.png' },
      ],
      default: 'short',
    },
    hairColor: { options: ['#000000', '#8B4513', '#FFD700'], default: '#000000' },
  },
  defaultClothingMap: {
    top: { color: '#FFFFFF', type: 'tshirt' },
    bottom: { color: '#1A1A2E', type: 'jeans' },
    shoes: { color: '#333333', type: 'sneakers' },
  },
  isActive: true,
  sortOrder: 0,
  createdAt: new Date(),
};

const MOCK_AVATAR = {
  id: 'avatar-uuid-1',
  userId: 'user-uuid-1',
  templateId: 'template-uuid-1',
  avatarParams: {
    face_shape: 50,
    eye_type: 'round',
    skin_tone: '#FFDBB4',
    hair_id: 'short',
    accessories: [],
  },
  clothingMap: {
    top: { color: '#FFFFFF', type: 'tshirt' },
    bottom: { color: '#1A1A2E', type: 'jeans' },
    shoes: { color: '#333333', type: 'sneakers' },
  },
  thumbnailUrl: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  userAvatar: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  avatarTemplate: {
    findUnique: jest.fn(),
  },
};

describe('AvatarService', () => {
  let service: AvatarService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvatarService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AvatarService>(AvatarService);
  });

  describe('create', () => {
    it('应成功创建Q版形象', async () => {
      mockPrisma.userAvatar.findFirst.mockResolvedValue(null);
      mockPrisma.avatarTemplate.findUnique.mockResolvedValue(MOCK_TEMPLATE);
      mockPrisma.userAvatar.create.mockResolvedValue(MOCK_AVATAR);

      const result = await service.create('user-uuid-1', {
        template_id: 'template-uuid-1',
        avatar_params: {
          face_shape: 50,
          eye_type: 'round',
          skin_tone: '#FFDBB4',
          hair_id: 'short',
        },
      });

      expect(result.id).toBe('avatar-uuid-1');
      expect(result.templateId).toBe('template-uuid-1');
      expect(mockPrisma.userAvatar.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-uuid-1',
            templateId: 'template-uuid-1',
          }),
        }),
      );
    });

    it('用户已有活跃形象时应抛出ConflictException', async () => {
      mockPrisma.userAvatar.findFirst.mockResolvedValue(MOCK_AVATAR);

      await expect(
        service.create('user-uuid-1', {
          template_id: 'template-uuid-1',
          avatar_params: { face_shape: 50 },
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('模板不存在时应抛出NotFoundException', async () => {
      mockPrisma.userAvatar.findFirst.mockResolvedValue(null);
      mockPrisma.avatarTemplate.findUnique.mockResolvedValue(null);

      await expect(
        service.create('user-uuid-1', {
          template_id: 'nonexistent',
          avatar_params: { face_shape: 50 },
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('模板已下架时应抛出BadRequestException', async () => {
      mockPrisma.userAvatar.findFirst.mockResolvedValue(null);
      mockPrisma.avatarTemplate.findUnique.mockResolvedValue({
        ...MOCK_TEMPLATE,
        isActive: false,
      });

      await expect(
        service.create('user-uuid-1', {
          template_id: 'template-uuid-1',
          avatar_params: { face_shape: 50 },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('脸型值超出范围时应抛出BadRequestException', async () => {
      mockPrisma.userAvatar.findFirst.mockResolvedValue(null);
      mockPrisma.avatarTemplate.findUnique.mockResolvedValue(MOCK_TEMPLATE);

      await expect(
        service.create('user-uuid-1', {
          template_id: 'template-uuid-1',
          avatar_params: { face_shape: 200 },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('眼型不在可选范围时应抛出BadRequestException', async () => {
      mockPrisma.userAvatar.findFirst.mockResolvedValue(null);
      mockPrisma.avatarTemplate.findUnique.mockResolvedValue(MOCK_TEMPLATE);

      await expect(
        service.create('user-uuid-1', {
          template_id: 'template-uuid-1',
          avatar_params: { eye_type: 'invalid_eye' },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('发型ID不在可选范围时应抛出BadRequestException', async () => {
      mockPrisma.userAvatar.findFirst.mockResolvedValue(null);
      mockPrisma.avatarTemplate.findUnique.mockResolvedValue(MOCK_TEMPLATE);

      await expect(
        service.create('user-uuid-1', {
          template_id: 'template-uuid-1',
          avatar_params: { hair_id: 'nonexistent_hair' },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('肤色不在可选范围时应抛出BadRequestException', async () => {
      mockPrisma.userAvatar.findFirst.mockResolvedValue(null);
      mockPrisma.avatarTemplate.findUnique.mockResolvedValue(MOCK_TEMPLATE);

      await expect(
        service.create('user-uuid-1', {
          template_id: 'template-uuid-1',
          avatar_params: { skin_tone: '#INVALID' },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('未传参数时应使用模板默认值', async () => {
      mockPrisma.userAvatar.findFirst.mockResolvedValue(null);
      mockPrisma.avatarTemplate.findUnique.mockResolvedValue(MOCK_TEMPLATE);
      mockPrisma.userAvatar.create.mockResolvedValue(MOCK_AVATAR);

      await service.create('user-uuid-1', {
        template_id: 'template-uuid-1',
        avatar_params: {},
      });

      expect(mockPrisma.userAvatar.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            avatarParams: expect.objectContaining({
              face_shape: 50,
              eye_type: 'round',
              skin_tone: '#FFDBB4',
              hair_id: 'short',
            }),
          }),
        }),
      );
    });
  });

  describe('getMyAvatar', () => {
    it('应返回用户活跃形象', async () => {
      mockPrisma.userAvatar.findFirst.mockResolvedValue(MOCK_AVATAR);

      const result = await service.getMyAvatar('user-uuid-1');

      expect(result.id).toBe('avatar-uuid-1');
      expect(result.avatarParams).toEqual(MOCK_AVATAR.avatarParams);
    });

    it('用户无形象时应抛出NotFoundException', async () => {
      mockPrisma.userAvatar.findFirst.mockResolvedValue(null);

      await expect(service.getMyAvatar('user-uuid-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('应部分更新形象参数', async () => {
      mockPrisma.userAvatar.findFirst.mockResolvedValue(MOCK_AVATAR);
      mockPrisma.avatarTemplate.findUnique.mockResolvedValue(MOCK_TEMPLATE);
      mockPrisma.userAvatar.update.mockResolvedValue({
        ...MOCK_AVATAR,
        avatarParams: { ...MOCK_AVATAR.avatarParams, face_shape: 75 },
      });

      const result = await service.update('user-uuid-1', {
        avatar_params: { face_shape: 75 },
      });

      expect(result.avatarParams.face_shape).toBe(75);
      expect(mockPrisma.userAvatar.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            avatarParams: expect.objectContaining({ face_shape: 75 }),
          }),
        }),
      );
    });

    it('未传avatar_params时应直接返回当前形象', async () => {
      mockPrisma.userAvatar.findFirst.mockResolvedValue(MOCK_AVATAR);

      const result = await service.update('user-uuid-1', {});

      expect(result.id).toBe('avatar-uuid-1');
      expect(mockPrisma.userAvatar.update).not.toHaveBeenCalled();
    });

    it('用户无形象时应抛出NotFoundException', async () => {
      mockPrisma.userAvatar.findFirst.mockResolvedValue(null);

      await expect(
        service.update('user-uuid-1', { avatar_params: { face_shape: 75 } }),
      ).rejects.toThrow(NotFoundException);
    });

    it('更新参数验证失败时应抛出BadRequestException', async () => {
      mockPrisma.userAvatar.findFirst.mockResolvedValue(MOCK_AVATAR);
      mockPrisma.avatarTemplate.findUnique.mockResolvedValue(MOCK_TEMPLATE);

      await expect(
        service.update('user-uuid-1', { avatar_params: { face_shape: 999 } }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('dress', () => {
    it('应合并更新clothing_map(只覆盖传入的slot)', async () => {
      mockPrisma.userAvatar.findFirst.mockResolvedValue(MOCK_AVATAR);
      mockPrisma.userAvatar.update.mockResolvedValue({
        ...MOCK_AVATAR,
        clothingMap: {
          ...MOCK_AVATAR.clothingMap,
          top: { color: '#E94560', type: 'blouse' },
        },
      });

      const result = await service.dress('user-uuid-1', {
        clothing_map: { top: { color: '#E94560', type: 'blouse' } },
      });

      const clothingMap = result.clothingMap as Record<string, unknown>;
      expect(clothingMap.top).toEqual({
        color: '#E94560',
        type: 'blouse',
      });
      expect(mockPrisma.userAvatar.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clothingMap: expect.objectContaining({
              top: { color: '#E94560', type: 'blouse' },
              bottom: { color: '#1A1A2E', type: 'jeans' },
            }),
          }),
        }),
      );
    });

    it('用户无形象时应抛出NotFoundException', async () => {
      mockPrisma.userAvatar.findFirst.mockResolvedValue(null);

      await expect(
        service.dress('user-uuid-1', {
          clothing_map: { top: { color: '#E94560', type: 'blouse' } },
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateThumbnail', () => {
    it('应更新缩略图URL', async () => {
      mockPrisma.userAvatar.findFirst.mockResolvedValue(MOCK_AVATAR);
      mockPrisma.userAvatar.update.mockResolvedValue({
        ...MOCK_AVATAR,
        thumbnailUrl: 'https://cdn.example.com/thumb.png',
      });

      const result = await service.updateThumbnail(
        'user-uuid-1',
        'https://cdn.example.com/thumb.png',
      );

      expect(result.thumbnailUrl).toBe('https://cdn.example.com/thumb.png');
      expect(mockPrisma.userAvatar.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            thumbnailUrl: 'https://cdn.example.com/thumb.png',
          }),
        }),
      );
    });

    it('用户无形象时应抛出NotFoundException', async () => {
      mockPrisma.userAvatar.findFirst.mockResolvedValue(null);

      await expect(
        service.updateThumbnail('user-uuid-1', 'https://cdn.example.com/thumb.png'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
