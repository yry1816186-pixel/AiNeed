import { Test, TestingModule } from '@nestjs/testing';
import { BodyAnalysisController } from '../body-analysis.controller';
import { BodyAnalysisService } from '../body-analysis.service';

describe('BodyAnalysisController', () => {
  let controller: BodyAnalysisController;
  let service: BodyAnalysisService;

  const mockBodyAnalysisService = {
    analyze: jest.fn(),
    getMyProfile: jest.fn(),
    analyzeColorSeason: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BodyAnalysisController],
      providers: [
        { provide: BodyAnalysisService, useValue: mockBodyAnalysisService },
      ],
    }).compile();

    controller = module.get<BodyAnalysisController>(BodyAnalysisController);
    service = module.get<BodyAnalysisService>(BodyAnalysisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('analyze', () => {
    const userId = 'user-001';
    const dto = {
      height: 165,
      weight: 55,
      shoulder_width: 38,
      waist: 65,
      hip: 90,
      gender: 'female' as const,
    };

    it('should call service.analyze with user id and dto', async () => {
      const mockResult = {
        bodyType: '沙漏形',
        description: 'Shoulder and hip widths are similar...',
        suitableStyles: ['收腰连衣裙', '高腰裤'],
        avoidStyles: ['宽松直筒'],
        colorSeason: 'spring',
      };
      mockBodyAnalysisService.analyze.mockResolvedValue(mockResult);

      const result = await controller.analyze(userId, dto);

      expect(service.analyze).toHaveBeenCalledWith(userId, dto);
      expect(result).toEqual(mockResult);
    });

    it('should handle male analysis', async () => {
      const maleDto = {
        height: 178,
        weight: 75,
        shoulder_width: 45,
        waist: 82,
        hip: 95,
        gender: 'male' as const,
      };
      const mockResult = {
        bodyType: '倒三角',
        description: 'Shoulders are broader than hips.',
        suitableStyles: ['阔腿裤', 'A字裙'],
        avoidStyles: ['垫肩'],
        colorSeason: 'winter',
      };
      mockBodyAnalysisService.analyze.mockResolvedValue(mockResult);

      const result = await controller.analyze(userId, maleDto);

      expect(service.analyze).toHaveBeenCalledWith(userId, maleDto);
      expect(result.bodyType).toBe('倒三角');
    });
  });

  describe('getMyProfile', () => {
    it('should return user profile when exists', async () => {
      const mockProfile = {
        id: 'profile-001',
        userId: 'user-001',
        bodyType: 'hourglass',
        colorSeason: 'spring',
        measurements: { height: 165, weight: 55 },
        analysisResult: { bodyType: 'hourglass' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockBodyAnalysisService.getMyProfile.mockResolvedValue(mockProfile);

      const result = await controller.getMyProfile('user-001');

      expect(service.getMyProfile).toHaveBeenCalledWith('user-001');
      expect(result).toEqual(mockProfile);
    });

    it('should return null when profile does not exist', async () => {
      mockBodyAnalysisService.getMyProfile.mockResolvedValue(null);

      const result = await controller.getMyProfile('user-001');

      expect(result).toBeNull();
    });
  });

  describe('analyzeColorSeason', () => {
    const userId = 'user-001';
    const dto = {
      skinTone: 'fair' as const,
      hairColor: 'blonde' as const,
      eyeColor: 'green' as const,
    };

    it('should call service.analyzeColorSeason with user id and dto', async () => {
      const mockResult = {
        season: '春季型',
        suitableColors: ['珊瑚色', '桃红'],
        avoidColors: ['纯黑', '深紫'],
        description: 'Spring type person has warm skin tone...',
      };
      mockBodyAnalysisService.analyzeColorSeason.mockResolvedValue(mockResult);

      const result = await controller.analyzeColorSeason(userId, dto);

      expect(service.analyzeColorSeason).toHaveBeenCalledWith(userId, dto);
      expect(result).toEqual(mockResult);
    });

    it('should return winter season for cool dark features', async () => {
      const winterDto = {
        skinTone: 'dark' as const,
        hairColor: 'black' as const,
        eyeColor: 'dark_brown' as const,
      };
      const mockResult = {
        season: '冬季型',
        suitableColors: ['纯白', '正红'],
        avoidColors: ['鹅黄', '浅橙'],
        description: 'Winter type person has cool skin tone...',
      };
      mockBodyAnalysisService.analyzeColorSeason.mockResolvedValue(mockResult);

      const result = await controller.analyzeColorSeason(userId, winterDto);

      expect(result.season).toBe('冬季型');
    });
  });
});
