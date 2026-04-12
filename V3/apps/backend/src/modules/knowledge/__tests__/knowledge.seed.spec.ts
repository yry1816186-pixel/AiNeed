import { Test, TestingModule } from '@nestjs/testing';
import { KnowledgeSeedService } from '../seed/knowledge.seed';
import { Neo4jService } from '../neo4j.service';

describe('KnowledgeSeedService', () => {
  let service: KnowledgeSeedService;
  let neo4jService: Neo4jService;

  const mockNeo4jService = {
    write: jest.fn().mockResolvedValue({ records: [] }),
    healthCheck: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeSeedService,
        { provide: Neo4jService, useValue: mockNeo4jService },
      ],
    }).compile();

    service = module.get<KnowledgeSeedService>(KnowledgeSeedService);
    neo4jService = module.get<Neo4jService>(Neo4jService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('run', () => {
    it('should return a valid seed result regardless of seed directory state', async () => {
      // The seed directory may or may not exist; either way, run should complete
      const result = await service.run();

      expect(result).toHaveProperty('nodesCreated');
      expect(result).toHaveProperty('relationshipsCreated');
      expect(result).toHaveProperty('filesProcessed');
      expect(result).toHaveProperty('details');
      expect(typeof result.nodesCreated).toBe('number');
      expect(typeof result.relationshipsCreated).toBe('number');
      expect(typeof result.filesProcessed).toBe('number');
      expect(Array.isArray(result.details)).toBe(true);
    });

    it('should report details for each file processed', async () => {
      const result = await service.run();

      // Details should be populated whether from file import or fallback
      expect(result.details!.length).toBeGreaterThan(0);
    });

    it('should handle write errors gracefully and continue', async () => {
      mockNeo4jService.write.mockRejectedValue(new Error('Neo4j write error'));

      // Should not throw - errors are caught internally
      const result = await service.run();

      expect(result).toBeDefined();
      expect(result).toHaveProperty('nodesCreated');
      expect(result).toHaveProperty('relationshipsCreated');
    });

    it('should produce results with non-negative counts', async () => {
      const result = await service.run();

      expect(result.nodesCreated).toBeGreaterThanOrEqual(0);
      expect(result.relationshipsCreated).toBeGreaterThanOrEqual(0);
      expect(result.filesProcessed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('healthCheck', () => {
    it('should delegate to neo4jService healthCheck', async () => {
      mockNeo4jService.healthCheck.mockResolvedValue(true);
      const result = await service.healthCheck();
      expect(result).toBe(true);
      expect(neo4jService.healthCheck).toHaveBeenCalled();
    });

    it('should return false when Neo4j is unhealthy', async () => {
      mockNeo4jService.healthCheck.mockResolvedValue(false);
      const result = await service.healthCheck();
      expect(result).toBe(false);
    });
  });
});
