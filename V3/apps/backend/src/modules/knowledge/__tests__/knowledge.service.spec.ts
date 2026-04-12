import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeService } from '../knowledge.service';
import { Neo4jService } from '../neo4j.service';
import { KnowledgeQueryDto, KnowledgeCategory } from '../dto/query-rules.dto';

describe('KnowledgeService', () => {
  let service: KnowledgeService;

  const mockNeo4jService = {
    read: jest.fn(),
    write: jest.fn(),
  };

  function createMockRecord(data: Record<string, unknown>) {
    return {
      get: jest.fn((key: string) => data[key] ?? null),
    };
  }

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeService,
        { provide: Neo4jService, useValue: mockNeo4jService },
      ],
    }).compile();

    service = module.get<KnowledgeService>(KnowledgeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findColorHarmony', () => {
    it('should return color harmony relations', async () => {
      const records = [
        createMockRecord({
          fromColor: 'navy_blue',
          toColor: 'camel',
          relationType: 'COMPLEMENTS',
          strength: 0.9,
          reason: '经典商务搭配',
        }),
      ];
      mockNeo4jService.read.mockResolvedValue({ records });

      const result = await service.findColorHarmony('navy_blue');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        fromColor: 'navy_blue',
        toColor: 'camel',
        relationType: 'COMPLEMENTS',
        strength: 0.9,
        reason: '经典商务搭配',
      });
    });

    it('should return empty array when no harmony found', async () => {
      mockNeo4jService.read.mockResolvedValue({ records: [] });

      const result = await service.findColorHarmony('unknown_color');

      expect(result).toHaveLength(0);
    });

    it('should handle Neo4j integer strength values', async () => {
      const records = [
        createMockRecord({
          fromColor: 'black',
          toColor: 'white',
          relationType: 'COMPLEMENTS',
          strength: { toNumber: () => 0.95 },
          reason: null,
        }),
      ];
      mockNeo4jService.read.mockResolvedValue({ records });

      const result = await service.findColorHarmony('black');

      expect(result[0].strength).toBe(0.95);
      expect(result[0].reason).toBeUndefined();
    });
  });

  describe('findColorConflicts', () => {
    it('should return color conflict relations', async () => {
      const records = [
        createMockRecord({
          fromColor: 'bright_red',
          toColor: 'bright_green',
          relationType: 'CONFLICTS_WITH',
          strength: 0.85,
          reason: '红绿撞色难以驾驭',
        }),
      ];
      mockNeo4jService.read.mockResolvedValue({ records });

      const result = await service.findColorConflicts('bright_red');

      expect(result).toHaveLength(1);
      expect(result[0].relationType).toBe('CONFLICTS_WITH');
    });
  });

  describe('findBodyTypeRules', () => {
    it('should return body type recommendations', async () => {
      const records = [
        createMockRecord({
          bodyType: 'hourglass',
          clothingType: 'dress',
          action: 'SUITABLE_FOR',
          recommendation: '收腰连衣裙完美展现沙漏身材曲线',
          examples: ['裹身裙', 'A字裙'],
          alternatives: null,
        }),
        createMockRecord({
          bodyType: 'hourglass',
          clothingType: 'oversized_top',
          action: 'AVOID_FOR',
          recommendation: 'oversized上装会遮盖身材优势',
          examples: null,
          alternatives: ['修身针织', '收腰衬衫'],
        }),
      ];
      mockNeo4jService.read.mockResolvedValue({ records });

      const result = await service.findBodyTypeRules('hourglass');

      expect(result).toHaveLength(2);
      expect(result[0].action).toBe('SUITABLE_FOR');
      expect(result[0].examples).toEqual(['裹身裙', 'A字裙']);
      expect(result[1].action).toBe('AVOID_FOR');
      expect(result[1].alternatives).toEqual(['修身针织', '收腰衬衫']);
    });
  });

  describe('findOccasionRules', () => {
    it('should return occasion style rules', async () => {
      const styleRecords = [
        createMockRecord({
          requiredStyles: ['business', 'minimalist'],
          requirements: '正式得体，专业感',
        }),
      ];
      const forbiddenRecords = [
        createMockRecord({
          forbiddenItems: ['sneakers'],
        }),
      ];
      mockNeo4jService.read
        .mockResolvedValueOnce({ records: styleRecords })
        .mockResolvedValueOnce({ records: forbiddenRecords });

      const result = await service.findOccasionRules('work');

      expect(result.occasion).toBe('work');
      expect(result.requiredStyles).toEqual(['business', 'minimalist']);
      expect(result.forbiddenItems).toEqual(['sneakers']);
      expect(result.requirements).toBe('正式得体，专业感');
    });

    it('should return empty arrays when no rules found', async () => {
      mockNeo4jService.read
        .mockResolvedValueOnce({ records: [] })
        .mockResolvedValueOnce({ records: [] });

      const result = await service.findOccasionRules('unknown');

      expect(result.requiredStyles).toEqual([]);
      expect(result.forbiddenItems).toEqual([]);
    });
  });

  describe('findStyleCompatibility', () => {
    it('should return compatibility when styles pair well', async () => {
      const records = [
        createMockRecord({ strength: 0.8 }),
      ];
      mockNeo4jService.read.mockResolvedValue({ records });

      const result = await service.findStyleCompatibility('minimalist', 'casual');

      expect(result.styleA).toBe('minimalist');
      expect(result.styleB).toBe('casual');
      expect(result.strength).toBe(0.8);
      expect(result.compatible).toBe(true);
    });

    it('should return incompatible when strength below threshold', async () => {
      const records = [
        createMockRecord({ strength: 0.3 }),
      ];
      mockNeo4jService.read.mockResolvedValue({ records });

      const result = await service.findStyleCompatibility('minimalist', 'streetwear');

      expect(result.strength).toBe(0.3);
      expect(result.compatible).toBe(false);
    });

    it('should return zero strength when no relationship found', async () => {
      mockNeo4jService.read.mockResolvedValue({ records: [] });

      const result = await service.findStyleCompatibility('unknown_a', 'unknown_b');

      expect(result.strength).toBe(0);
      expect(result.compatible).toBe(false);
    });
  });

  describe('queryKnowledge', () => {
    it('should query color rules when colors provided', async () => {
      const records = [
        createMockRecord({
          fromColor: 'black',
          toColor: 'white',
          relationType: 'COMPLEMENTS',
          strength: 0.95,
          reason: '永恒经典',
        }),
      ];
      mockNeo4jService.read.mockResolvedValue({ records });

      const query: KnowledgeQueryDto = {
        colors: ['black'],
        category: KnowledgeCategory.COLOR,
      };

      const result = await service.queryKnowledge(query);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].category).toBe('color');
    });

    it('should query body type rules when bodyType provided', async () => {
      const records = [
        createMockRecord({
          bodyType: 'hourglass',
          clothingType: 'dress',
          action: 'SUITABLE_FOR',
          recommendation: '收腰连衣裙',
        }),
      ];
      mockNeo4jService.read.mockResolvedValue({ records });

      const query: KnowledgeQueryDto = {
        bodyType: 'hourglass',
        category: KnowledgeCategory.BODY_TYPE,
      };

      const result = await service.queryKnowledge(query);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].category).toBe('body_type');
    });

    it('should query occasion rules when occasion provided', async () => {
      const records = [
        createMockRecord({
          targetType: 'Style',
          targetName: 'business',
          relationType: 'REQUIRES',
          requirements: '正式得体',
        }),
      ];
      mockNeo4jService.read.mockResolvedValue({ records });

      const query: KnowledgeQueryDto = {
        occasion: 'work',
        category: KnowledgeCategory.OCCASION,
      };

      const result = await service.queryKnowledge(query);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].category).toBe('occasion');
    });

    it('should query season rules when season provided', async () => {
      const records = [
        createMockRecord({
          targetType: 'Color',
          targetName: 'white',
          relationType: 'RECOMMENDS_COLOR',
        }),
      ];
      mockNeo4jService.read.mockResolvedValue({ records });

      const query: KnowledgeQueryDto = {
        season: 'summer',
        category: KnowledgeCategory.SEASON,
      };

      const result = await service.queryKnowledge(query);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].category).toBe('season');
    });

    it('should query style rules when style provided', async () => {
      const records = [
        createMockRecord({
          styleA: 'minimalist',
          styleB: 'casual',
          strength: 0.8,
        }),
      ];
      mockNeo4jService.read.mockResolvedValue({ records });

      const query: KnowledgeQueryDto = {
        style: 'minimalist',
        category: KnowledgeCategory.STYLE,
      };

      const result = await service.queryKnowledge(query);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].category).toBe('style');
    });

    it('should return empty array when no query params provided', async () => {
      const query: KnowledgeQueryDto = {};

      const result = await service.queryKnowledge(query);

      expect(result).toEqual([]);
    });

    it('should combine results from multiple categories', async () => {
      const colorRecords = [
        createMockRecord({
          fromColor: 'black',
          toColor: 'white',
          relationType: 'COMPLEMENTS',
          strength: 0.95,
          reason: '经典',
        }),
      ];
      const bodyRecords = [
        createMockRecord({
          bodyType: 'hourglass',
          clothingType: 'dress',
          action: 'SUITABLE_FOR',
          recommendation: '收腰连衣裙',
        }),
      ];

      mockNeo4jService.read
        .mockResolvedValueOnce({ records: colorRecords })
        .mockResolvedValueOnce({ records: bodyRecords });

      const query: KnowledgeQueryDto = {
        colors: ['black'],
        bodyType: 'hourglass',
      };

      const result = await service.queryKnowledge(query);

      expect(result.length).toBe(2);
      expect(result.some((r) => r.category === 'color')).toBe(true);
      expect(result.some((r) => r.category === 'body_type')).toBe(true);
    });

    it('should query with minStrength filter for color rules', async () => {
      const records = [
        createMockRecord({
          fromColor: 'black',
          toColor: 'white',
          relationType: 'COMPLEMENTS',
          strength: 0.95,
          reason: 'Classic',
        }),
      ];
      mockNeo4jService.read.mockResolvedValue({ records });

      const query: KnowledgeQueryDto = {
        colors: ['black'],
        minStrength: 0.5,
      };

      const result = await service.queryKnowledge(query);

      expect(result.length).toBeGreaterThan(0);
      // Verify that the cypher contains the strength filter
      const callArgs = mockNeo4jService.read.mock.calls[0];
      expect(callArgs[0]).toContain('minStrength');
    });

    it('should query with minStrength filter for season rules', async () => {
      const records = [
        createMockRecord({
          targetType: 'Color',
          targetName: 'white',
          relationType: 'RECOMMENDS_COLOR',
        }),
      ];
      mockNeo4jService.read.mockResolvedValue({ records });

      const query: KnowledgeQueryDto = {
        season: 'summer',
        minStrength: 0.5,
      };

      const result = await service.queryKnowledge(query);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].category).toBe('season');
    });

    it('should query with minStrength filter for style rules', async () => {
      const records = [
        createMockRecord({
          styleA: 'minimalist',
          styleB: 'casual',
          strength: 0.8,
        }),
      ];
      mockNeo4jService.read.mockResolvedValue({ records });

      const query: KnowledgeQueryDto = {
        style: 'minimalist',
        minStrength: 0.5,
      };

      const result = await service.queryKnowledge(query);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].category).toBe('style');
    });

    it('should query color rules with multiple colors', async () => {
      const records = [
        createMockRecord({
          fromColor: 'black',
          toColor: 'white',
          relationType: 'COMPLEMENTS',
          strength: 0.95,
          reason: 'Classic',
        }),
      ];
      mockNeo4jService.read.mockResolvedValue({ records });

      const query: KnowledgeQueryDto = {
        colors: ['black', 'navy_blue', 'camel'],
      };

      const result = await service.queryKnowledge(query);

      expect(result.length).toBeGreaterThan(0);
      // Verify multiple color params were passed
      const callArgs = mockNeo4jService.read.mock.calls[0];
      expect(callArgs[1]).toHaveProperty('color0', 'black');
      expect(callArgs[1]).toHaveProperty('color1', 'navy_blue');
      expect(callArgs[1]).toHaveProperty('color2', 'camel');
    });

    it('should generate "dont" ruleType for CONFLICTS_WITH color relations', async () => {
      const records = [
        createMockRecord({
          fromColor: 'red',
          toColor: 'green',
          relationType: 'CONFLICTS_WITH',
          strength: 0.85,
          reason: 'Clash',
        }),
      ];
      mockNeo4jService.read.mockResolvedValue({ records });

      const query: KnowledgeQueryDto = {
        colors: ['red'],
      };

      const result = await service.queryKnowledge(query);

      expect(result[0].ruleType).toBe('dont');
      expect(result[0].recommendation).toContain('冲突');
    });

    it('should generate "dont" ruleType for AVOID_FOR body type relations', async () => {
      const records = [
        createMockRecord({
          bodyType: 'hourglass',
          clothingType: 'oversized_top',
          action: 'AVOID_FOR',
          recommendation: 'Avoid oversized',
        }),
      ];
      mockNeo4jService.read.mockResolvedValue({ records });

      const query: KnowledgeQueryDto = {
        bodyType: 'hourglass',
      };

      const result = await service.queryKnowledge(query);

      expect(result[0].ruleType).toBe('dont');
    });

    it('should generate "dont" ruleType for non-REQUIRES occasion relations', async () => {
      const records = [
        createMockRecord({
          targetType: 'Clothing',
          targetName: 'sneakers',
          relationType: 'FORBIDS',
          requirements: 'No sneakers at work',
        }),
      ];
      mockNeo4jService.read.mockResolvedValue({ records });

      const query: KnowledgeQueryDto = {
        occasion: 'work',
      };

      const result = await service.queryKnowledge(query);

      expect(result[0].ruleType).toBe('dont');
      expect(result[0].recommendation).toContain('禁忌');
    });
  });

  describe('toNumber edge cases', () => {
    it('should handle null strength values in findColorHarmony', async () => {
      const records = [
        createMockRecord({
          fromColor: 'black',
          toColor: 'white',
          relationType: 'COMPLEMENTS',
          strength: null,
          reason: 'Classic',
        }),
      ];
      mockNeo4jService.read.mockResolvedValue({ records });

      const result = await service.findColorHarmony('black');

      expect(result[0].strength).toBe(0);
    });

    it('should handle undefined strength values', async () => {
      const records = [
        createMockRecord({
          fromColor: 'red',
          toColor: 'blue',
          relationType: 'CONFLICTS_WITH',
          strength: undefined,
          reason: null,
        }),
      ];
      mockNeo4jService.read.mockResolvedValue({ records });

      const result = await service.findColorConflicts('red');

      expect(result[0].strength).toBe(0);
      expect(result[0].reason).toBeUndefined();
    });

    it('should handle numeric string strength values', async () => {
      const records = [
        createMockRecord({
          fromColor: 'black',
          toColor: 'white',
          relationType: 'COMPLEMENTS',
          strength: '0.8',
          reason: 'Classic',
        }),
      ];
      mockNeo4jService.read.mockResolvedValue({ records });

      const result = await service.findColorHarmony('black');

      expect(result[0].strength).toBe(0.8);
    });
  });

  describe('toStringArray edge cases', () => {
    it('should handle null examples and alternatives in body type rules', async () => {
      const records = [
        createMockRecord({
          bodyType: 'hourglass',
          clothingType: 'dress',
          action: 'SUITABLE_FOR',
          recommendation: 'Wrap dress',
          examples: null,
          alternatives: null,
        }),
      ];
      mockNeo4jService.read.mockResolvedValue({ records });

      const result = await service.findBodyTypeRules('hourglass');

      expect(result[0].examples).toEqual([]);
      expect(result[0].alternatives).toEqual([]);
    });

    it('should handle empty array for occasion rules', async () => {
      mockNeo4jService.read
        .mockResolvedValueOnce({ records: [] })
        .mockResolvedValueOnce({ records: [] });

      const result = await service.findOccasionRules('unknown');

      expect(result.requiredStyles).toEqual([]);
      expect(result.forbiddenItems).toEqual([]);
      expect(result.requirements).toBeUndefined();
    });

    it('should handle null recommendation in body type rules', async () => {
      const records = [
        createMockRecord({
          bodyType: 'hourglass',
          clothingType: 'dress',
          action: 'SUITABLE_FOR',
          recommendation: null,
          examples: ['wrap dress'],
          alternatives: ['pencil skirt'],
        }),
      ];
      mockNeo4jService.read.mockResolvedValue({ records });

      const result = await service.findBodyTypeRules('hourglass');

      expect(result[0].recommendation).toBe('');
      expect(result[0].examples).toEqual(['wrap dress']);
      expect(result[0].alternatives).toEqual(['pencil skirt']);
    });
  });

  describe('findOccasionRules with requirements', () => {
    it('should include requirements when available', async () => {
      const styleRecords = [
        createMockRecord({
          requiredStyles: ['business'],
          requirements: 'Professional attire required',
        }),
      ];
      const forbiddenRecords = [
        createMockRecord({
          forbiddenItems: ['sneakers'],
        }),
      ];
      mockNeo4jService.read
        .mockResolvedValueOnce({ records: styleRecords })
        .mockResolvedValueOnce({ records: forbiddenRecords });

      const result = await service.findOccasionRules('work');

      expect(result.requirements).toBe('Professional attire required');
    });

    it('should not include requirements when styleRecord has none', async () => {
      const styleRecords = [
        createMockRecord({
          requiredStyles: ['casual'],
          requirements: null,
        }),
      ];
      const forbiddenRecords = [
        createMockRecord({
          forbiddenItems: [],
        }),
      ];
      mockNeo4jService.read
        .mockResolvedValueOnce({ records: styleRecords })
        .mockResolvedValueOnce({ records: forbiddenRecords });

      const result = await service.findOccasionRules('casual');

      expect(result.requirements).toBeUndefined();
    });
  });
});
