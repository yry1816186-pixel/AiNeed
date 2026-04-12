import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeController } from '../knowledge.controller';
import { KnowledgeService } from '../knowledge.service';
import { KnowledgeSeedService } from '../seed/knowledge.seed';

describe('KnowledgeController', () => {
  let controller: KnowledgeController;
  let knowledgeService: KnowledgeService;
  let seedService: KnowledgeSeedService;

  const mockKnowledgeService = {
    findColorHarmony: jest.fn(),
    findColorConflicts: jest.fn(),
    findBodyTypeRules: jest.fn(),
    findOccasionRules: jest.fn(),
    findStyleCompatibility: jest.fn(),
    queryKnowledge: jest.fn(),
  };

  const mockSeedService = {
    run: jest.fn(),
    healthCheck: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [KnowledgeController],
      providers: [
        { provide: KnowledgeService, useValue: mockKnowledgeService },
        { provide: KnowledgeSeedService, useValue: mockSeedService },
      ],
    }).compile();

    controller = module.get<KnowledgeController>(KnowledgeController);
    knowledgeService = module.get<KnowledgeService>(KnowledgeService);
    seedService = module.get<KnowledgeSeedService>(KnowledgeSeedService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getColorHarmony', () => {
    it('should return color harmonies with color name', async () => {
      const harmonies = [
        { fromColor: 'navy_blue', toColor: 'camel', relationType: 'COMPLEMENTS', strength: 0.9, reason: 'Classic' },
      ];
      mockKnowledgeService.findColorHarmony.mockResolvedValue(harmonies);

      const result = await controller.getColorHarmony({ color: 'navy_blue' });

      expect(result.color).toBe('navy_blue');
      expect(result.harmonies).toEqual(harmonies);
      expect(knowledgeService.findColorHarmony).toHaveBeenCalledWith('navy_blue');
    });

    it('should return empty harmonies when no matches found', async () => {
      mockKnowledgeService.findColorHarmony.mockResolvedValue([]);

      const result = await controller.getColorHarmony({ color: 'unknown' });

      expect(result.color).toBe('unknown');
      expect(result.harmonies).toEqual([]);
    });
  });

  describe('getColorConflict', () => {
    it('should return color conflicts', async () => {
      const conflicts = [
        { fromColor: 'red', toColor: 'green', relationType: 'CONFLICTS_WITH', strength: 0.85, reason: 'Clash' },
      ];
      mockKnowledgeService.findColorConflicts.mockResolvedValue(conflicts);

      const result = await controller.getColorConflict({ color: 'red' });

      expect(result.color).toBe('red');
      expect(result.conflicts).toEqual(conflicts);
      expect(knowledgeService.findColorConflicts).toHaveBeenCalledWith('red');
    });
  });

  describe('getBodyTypeRecommendations', () => {
    it('should return body type recommendations', async () => {
      const recommendations = [
        { bodyType: 'hourglass', clothingType: 'dress', action: 'SUITABLE_FOR', recommendation: 'Wrap dress' },
      ];
      mockKnowledgeService.findBodyTypeRules.mockResolvedValue(recommendations);

      const result = await controller.getBodyTypeRecommendations('hourglass');

      expect(result.bodyType).toBe('hourglass');
      expect(result.recommendations).toEqual(recommendations);
      expect(knowledgeService.findBodyTypeRules).toHaveBeenCalledWith('hourglass');
    });

    it('should return empty recommendations for unknown body type', async () => {
      mockKnowledgeService.findBodyTypeRules.mockResolvedValue([]);

      const result = await controller.getBodyTypeRecommendations('unknown');

      expect(result.bodyType).toBe('unknown');
      expect(result.recommendations).toEqual([]);
    });
  });

  describe('getOccasionStyles', () => {
    it('should return occasion style rules', async () => {
      const occasionRules = {
        occasion: 'work',
        requiredStyles: ['business', 'minimalist'],
        forbiddenItems: ['sneakers'],
        requirements: 'Professional look',
      };
      mockKnowledgeService.findOccasionRules.mockResolvedValue(occasionRules);

      const result = await controller.getOccasionStyles('work');

      expect(result).toEqual(occasionRules);
      expect(knowledgeService.findOccasionRules).toHaveBeenCalledWith('work');
    });
  });

  describe('getStyleCompatibility', () => {
    it('should return style compatibility result', async () => {
      const compatibility = { styleA: 'minimalist', styleB: 'casual', strength: 0.8, compatible: true };
      mockKnowledgeService.findStyleCompatibility.mockResolvedValue(compatibility);

      const result = await controller.getStyleCompatibility({ styleA: 'minimalist', styleB: 'casual' });

      expect(result).toEqual(compatibility);
      expect(knowledgeService.findStyleCompatibility).toHaveBeenCalledWith('minimalist', 'casual');
    });
  });

  describe('queryKnowledge', () => {
    it('should return rules with total count', async () => {
      const rules = [
        { category: 'color', ruleType: 'do', condition: {}, recommendation: 'Test', strength: 0.9 },
      ];
      mockKnowledgeService.queryKnowledge.mockResolvedValue(rules);

      const result = await controller.queryKnowledge({ colors: ['black'] });

      expect(result.rules).toEqual(rules);
      expect(result.total).toBe(1);
      expect(knowledgeService.queryKnowledge).toHaveBeenCalledWith({ colors: ['black'] });
    });

    it('should return empty rules when query has no results', async () => {
      mockKnowledgeService.queryKnowledge.mockResolvedValue([]);

      const result = await controller.queryKnowledge({});

      expect(result.rules).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('seedKnowledge', () => {
    it('should call seed service run method', async () => {
      const seedResult = { nodesCreated: 10, relationshipsCreated: 5, filesProcessed: 1, details: ['ok'] };
      mockSeedService.run.mockResolvedValue(seedResult);

      const result = await controller.seedKnowledge();

      expect(result).toEqual(seedResult);
      expect(seedService.run).toHaveBeenCalled();
    });
  });

  describe('healthCheck', () => {
    it('should return ok when Neo4j is healthy', async () => {
      mockSeedService.healthCheck.mockResolvedValue(true);

      const result = await controller.healthCheck();

      expect(result).toEqual({ status: 'ok', service: 'neo4j' });
    });

    it('should return unhealthy when Neo4j is not healthy', async () => {
      mockSeedService.healthCheck.mockResolvedValue(false);

      const result = await controller.healthCheck();

      expect(result).toEqual({ status: 'unhealthy', service: 'neo4j' });
    });
  });
});
