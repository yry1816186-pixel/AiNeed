import { Test } from '@nestjs/testing';
import { BodyAnalysisService } from '../body-analysis.service';
import { PrismaService } from '../../../prisma/prisma.service';

const mockDb = {
  bodyProfile: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  user: {
    update: jest.fn(),
  },
};

describe('BodyAnalysisService', () => {
  let service: BodyAnalysisService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module = await Test.createTestingModule({
      providers: [
        BodyAnalysisService,
        { provide: PrismaService, useValue: mockDb },
      ],
    }).compile();

    service = module.get<BodyAnalysisService>(BodyAnalysisService);
  });

  const userId = 'user-001';

  describe('analyze', () => {
    it('should analyze female hourglass body type with full measurements', async () => {
      mockDb.bodyProfile.upsert.mockResolvedValue({});
      mockDb.user.update.mockResolvedValue({});

      const result = await service.analyze(userId, {
        height: 165,
        weight: 55,
        shoulder_width: 38,
        waist: 65,
        hip: 90,
        gender: 'female',
      });

      expect(result.bodyType).toBeDefined();
      expect(result.description).toBeDefined();
      expect(result.suitableStyles.length).toBeGreaterThan(0);
      expect(result.avoidStyles.length).toBeGreaterThan(0);
      expect(result.colorSeason).toBeDefined();
      expect(mockDb.bodyProfile.upsert).toHaveBeenCalled();
      expect(mockDb.user.update).toHaveBeenCalled();
    });

    it('should analyze male body type with full measurements', async () => {
      mockDb.bodyProfile.upsert.mockResolvedValue({});
      mockDb.user.update.mockResolvedValue({});

      const result = await service.analyze(userId, {
        height: 178,
        weight: 75,
        shoulder_width: 45,
        waist: 82,
        hip: 95,
        gender: 'male',
      });

      expect(result.bodyType).toBeDefined();
      expect(result.description).toBeDefined();
    });

    it('should analyze body type with partial measurements (no waist/hip)', async () => {
      mockDb.bodyProfile.upsert.mockResolvedValue({});
      mockDb.user.update.mockResolvedValue({});

      const result = await service.analyze(userId, {
        height: 160,
        weight: 50,
        gender: 'female',
      });

      expect(result.bodyType).toBeDefined();
      expect(result.description).toBeDefined();
    });

    it('should analyze apple type for high BMI female', async () => {
      mockDb.bodyProfile.upsert.mockResolvedValue({});
      mockDb.user.update.mockResolvedValue({});

      const result = await service.analyze(userId, {
        height: 160,
        weight: 75,
        gender: 'female',
      });

      expect(result.bodyType).toBeDefined();
    });

    it('should save measurements to body profile', async () => {
      mockDb.bodyProfile.upsert.mockResolvedValue({});
      mockDb.user.update.mockResolvedValue({});

      await service.analyze(userId, {
        height: 165,
        weight: 55,
        shoulder_width: 38,
        waist: 65,
        hip: 90,
        gender: 'female',
      });

      const upsertCall = mockDb.bodyProfile.upsert.mock.calls[0][0] as Record<string, unknown>;
      const createData = (upsertCall.create as Record<string, unknown>);
      const measurements = createData.measurements as Record<string, number>;

      expect(measurements.height).toBe(165);
      expect(measurements.weight).toBe(55);
      expect(measurements.shoulderWidth).toBe(38);
      expect(measurements.waist).toBe(65);
      expect(measurements.hip).toBe(90);
    });

    it('should update user bodyType and colorSeason', async () => {
      mockDb.bodyProfile.upsert.mockResolvedValue({});
      mockDb.user.update.mockResolvedValue({});

      await service.analyze(userId, {
        height: 165,
        weight: 55,
        shoulder_width: 38,
        waist: 65,
        hip: 90,
        gender: 'female',
      });

      const updateCall = mockDb.user.update.mock.calls[0][0] as Record<string, unknown>;
      const data = (updateCall.data as Record<string, unknown>);
      expect(data.bodyType).toBeDefined();
      expect(data.colorSeason).toBeDefined();
    });
  });

  describe('getMyProfile', () => {
    it('should return profile when exists', async () => {
      const mockProfile = {
        id: 'profile-001',
        userId,
        bodyType: 'hourglass',
        colorSeason: 'spring',
        measurements: { height: 165, weight: 55 },
        analysisResult: { bodyType: 'hourglass' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockDb.bodyProfile.findUnique.mockResolvedValue(mockProfile);

      const result = await service.getMyProfile(userId);
      expect(result).toEqual(mockProfile);
    });

    it('should return null when profile does not exist', async () => {
      mockDb.bodyProfile.findUnique.mockResolvedValue(null);

      const result = await service.getMyProfile(userId);
      expect(result).toBeNull();
    });
  });

  describe('analyzeColorSeason', () => {
    it('should analyze spring color season for warm light features', async () => {
      mockDb.bodyProfile.upsert.mockResolvedValue({});
      mockDb.user.update.mockResolvedValue({});

      const result = await service.analyzeColorSeason(userId, {
        skinTone: 'fair',
        hairColor: 'blonde',
        eyeColor: 'green',
      });

      expect(result.season).toBeDefined();
      expect(result.suitableColors.length).toBeGreaterThan(0);
      expect(result.avoidColors.length).toBeGreaterThan(0);
      expect(result.description).toBeDefined();
      expect(mockDb.bodyProfile.upsert).toHaveBeenCalled();
      expect(mockDb.user.update).toHaveBeenCalled();
    });

    it('should analyze winter color season for cool dark features', async () => {
      mockDb.bodyProfile.upsert.mockResolvedValue({});
      mockDb.user.update.mockResolvedValue({});

      const result = await service.analyzeColorSeason(userId, {
        skinTone: 'dark',
        hairColor: 'black',
        eyeColor: 'dark_brown',
      });

      expect(result.season).toBeDefined();
      expect(result.suitableColors.length).toBeGreaterThan(0);
    });

    it('should analyze autumn color season for warm deep features', async () => {
      mockDb.bodyProfile.upsert.mockResolvedValue({});
      mockDb.user.update.mockResolvedValue({});

      const result = await service.analyzeColorSeason(userId, {
        skinTone: 'olive',
        hairColor: 'brown',
        eyeColor: 'hazel',
      });

      expect(result.season).toBeDefined();
    });

    it('should analyze summer color season for cool light features', async () => {
      mockDb.bodyProfile.upsert.mockResolvedValue({});
      mockDb.user.update.mockResolvedValue({});

      const result = await service.analyzeColorSeason(userId, {
        skinTone: 'medium',
        hairColor: 'dark_brown',
        eyeColor: 'blue',
      });

      expect(result.season).toBeDefined();
    });

    it('should update user colorSeason on profile', async () => {
      mockDb.bodyProfile.upsert.mockResolvedValue({});
      mockDb.user.update.mockResolvedValue({});

      await service.analyzeColorSeason(userId, {
        skinTone: 'fair',
        hairColor: 'red',
        eyeColor: 'hazel',
      });

      const updateCall = mockDb.user.update.mock.calls[0][0] as Record<string, unknown>;
      const data = (updateCall.data as Record<string, unknown>);
      expect(data.colorSeason).toBeDefined();
    });
  });
});
