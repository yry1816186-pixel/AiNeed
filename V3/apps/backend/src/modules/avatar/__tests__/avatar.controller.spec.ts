import { Test, TestingModule } from '@nestjs/testing';
import { AvatarController } from '../avatar.controller';
import { AvatarService } from '../avatar.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { JwtModule } from '@nestjs/jwt';

describe('AvatarController', () => {
  let controller: AvatarController;
  let service: AvatarService;

  const mockAvatarService = {
    create: jest.fn(),
    getMyAvatar: jest.fn(),
    update: jest.fn(),
    dress: jest.fn(),
    updateThumbnail: jest.fn(),
  };

  const mockAuthGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({ secret: 'test-secret' }),
      ],
      controllers: [AvatarController],
      providers: [
        { provide: AvatarService, useValue: mockAvatarService },
        { provide: JwtAuthGuard, useValue: mockAuthGuard },
      ],
    }).compile();

    controller = module.get<AvatarController>(AvatarController);
    service = module.get<AvatarService>(AvatarService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const MOCK_RESPONSE = {
    id: 'avatar-uuid-1',
    templateId: 'template-uuid-1',
    avatarParams: { face_shape: 50, eye_type: 'round' },
    clothingMap: { top: { color: '#FFFFFF', type: 'tshirt' } },
    thumbnailUrl: null,
  };

  describe('create', () => {
    it('应调用service.create并返回结果', async () => {
      mockAvatarService.create.mockResolvedValue(MOCK_RESPONSE);

      const result = await controller.create('user-uuid-1', {
        template_id: 'template-uuid-1',
        avatar_params: { face_shape: 50, eye_type: 'round' },
      });

      expect(result).toEqual(MOCK_RESPONSE);
      expect(service.create).toHaveBeenCalledWith('user-uuid-1', {
        template_id: 'template-uuid-1',
        avatar_params: { face_shape: 50, eye_type: 'round' },
      });
    });
  });

  describe('getMyAvatar', () => {
    it('应调用service.getMyAvatar并返回结果', async () => {
      mockAvatarService.getMyAvatar.mockResolvedValue(MOCK_RESPONSE);

      const result = await controller.getMyAvatar('user-uuid-1');

      expect(result).toEqual(MOCK_RESPONSE);
      expect(service.getMyAvatar).toHaveBeenCalledWith('user-uuid-1');
    });
  });

  describe('update', () => {
    it('应调用service.update并返回结果', async () => {
      const updatedResponse = {
        ...MOCK_RESPONSE,
        avatarParams: { ...MOCK_RESPONSE.avatarParams, face_shape: 75 },
      };
      mockAvatarService.update.mockResolvedValue(updatedResponse);

      const result = await controller.update('user-uuid-1', {
        avatar_params: { face_shape: 75 },
      });

      expect(result).toEqual(updatedResponse);
      expect(service.update).toHaveBeenCalledWith('user-uuid-1', {
        avatar_params: { face_shape: 75 },
      });
    });
  });

  describe('dress', () => {
    it('应调用service.dress并返回结果', async () => {
      const dressedResponse = {
        ...MOCK_RESPONSE,
        clothingMap: {
          ...MOCK_RESPONSE.clothingMap,
          top: { color: '#E94560', type: 'blouse' },
        },
      };
      mockAvatarService.dress.mockResolvedValue(dressedResponse);

      const result = await controller.dress('user-uuid-1', {
        clothing_map: { top: { color: '#E94560', type: 'blouse' } },
      });

      expect(result).toEqual(dressedResponse);
      expect(service.dress).toHaveBeenCalledWith('user-uuid-1', {
        clothing_map: { top: { color: '#E94560', type: 'blouse' } },
      });
    });
  });

  describe('updateThumbnail', () => {
    it('应调用service.updateThumbnail并返回结果', async () => {
      const thumbResponse = {
        ...MOCK_RESPONSE,
        thumbnailUrl: 'https://cdn.example.com/thumb.png',
      };
      mockAvatarService.updateThumbnail.mockResolvedValue(thumbResponse);

      const result = await controller.updateThumbnail('user-uuid-1', {
        image_url: 'https://cdn.example.com/thumb.png',
      });

      expect(result).toEqual(thumbResponse);
      expect(service.updateThumbnail).toHaveBeenCalledWith(
        'user-uuid-1',
        'https://cdn.example.com/thumb.png',
      );
    });
  });
});
