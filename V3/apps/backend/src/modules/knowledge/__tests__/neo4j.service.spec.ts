import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Neo4jService } from '../neo4j.service';

jest.mock('neo4j-driver', () => {
  const mockSession = {
    run: jest.fn().mockResolvedValue({ records: [] }),
    close: jest.fn().mockResolvedValue(undefined),
  };
  const mockDriver = {
    session: jest.fn(() => mockSession),
    verifyConnectivity: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
  };
  return {
    driver: jest.fn(() => mockDriver),
    auth: {
      basic: jest.fn((user: string, password: string) => ({ user, password })),
    },
    session: {
      READ: 'READ',
      WRITE: 'WRITE',
    },
  };
});

import neo4j from 'neo4j-driver';

describe('Neo4jService', () => {
  let service: Neo4jService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        NEO4J_URL: 'bolt://localhost:7687',
        NEO4J_USER: 'neo4j',
        NEO4J_PASSWORD: 'test_password',
      };
      return config[key];
    }),
  };

  const getMockDriver = () => (neo4j.driver as jest.Mock).mock.results[0]?.value ?? {
    session: jest.fn(),
    verifyConnectivity: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
  };

  const getMockSession = () => {
    const driver = getMockDriver();
    return driver.session();
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Neo4jService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<Neo4jService>(Neo4jService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should initialize driver with config values', async () => {
      await service.onModuleInit();

      expect(neo4j.driver).toHaveBeenCalledWith(
        'bolt://localhost:7687',
        expect.anything(),
        expect.any(Object),
      );
      expect(mockConfigService.get).toHaveBeenCalledWith('NEO4J_URL');
      expect(mockConfigService.get).toHaveBeenCalledWith('NEO4J_USER');
      expect(mockConfigService.get).toHaveBeenCalledWith('NEO4J_PASSWORD');
    });

    it('should use default values when config is missing', async () => {
      mockConfigService.get.mockReturnValue(undefined as unknown as string);
      await service.onModuleInit();

      expect(neo4j.driver).toHaveBeenCalledWith(
        'bolt://localhost:7687',
        expect.anything(),
        expect.any(Object),
      );
    });
  });

  describe('onModuleDestroy', () => {
    it('should close the driver', async () => {
      await service.onModuleInit();
      await service.onModuleDestroy();
      expect(getMockDriver().close).toHaveBeenCalled();
    });

    it('should handle null driver gracefully', async () => {
      (service as unknown as { driver: unknown }).driver = null;
      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });
  });

  describe('getDriver', () => {
    it('should return the driver when initialized', async () => {
      await service.onModuleInit();
      const driver = service.getDriver();
      expect(driver).toBeDefined();
    });

    it('should throw when driver is not initialized', () => {
      (service as unknown as { driver: unknown }).driver = null;
      expect(() => service.getDriver()).toThrow('Neo4j driver not initialized');
    });
  });

  describe('getReadSession', () => {
    it('should return a read session', async () => {
      await service.onModuleInit();
      const session = service.getReadSession();
      expect(getMockDriver().session).toHaveBeenCalledWith(
        expect.objectContaining({ defaultAccessMode: 'READ' }),
      );
      expect(session).toBeDefined();
    });
  });

  describe('getWriteSession', () => {
    it('should return a write session', async () => {
      await service.onModuleInit();
      const session = service.getWriteSession();
      expect(getMockDriver().session).toHaveBeenCalledWith(
        expect.objectContaining({ defaultAccessMode: 'WRITE' }),
      );
      expect(session).toBeDefined();
    });
  });

  describe('read', () => {
    it('should execute read query and close session', async () => {
      await service.onModuleInit();
      const mockResult = { records: [] };
      getMockSession().run.mockResolvedValue(mockResult);

      const result = await service.read('MATCH (n) RETURN n', { limit: 10 });

      expect(getMockSession().run).toHaveBeenCalledWith('MATCH (n) RETURN n', { limit: 10 });
      expect(getMockSession().close).toHaveBeenCalled();
      expect(result).toBe(mockResult);
    });

    it('should close session even on error', async () => {
      await service.onModuleInit();
      getMockSession().run.mockRejectedValue(new Error('Query failed'));

      await expect(service.read('INVALID CYPHER')).rejects.toThrow('Query failed');
      expect(getMockSession().close).toHaveBeenCalled();
    });
  });

  describe('write', () => {
    it('should execute write query and close session', async () => {
      await service.onModuleInit();
      const mockResult = { records: [] };
      getMockSession().run.mockResolvedValue(mockResult);

      const result = await service.write('CREATE (n:Test) RETURN n', { name: 'test' });

      expect(getMockSession().run).toHaveBeenCalledWith('CREATE (n:Test) RETURN n', { name: 'test' });
      expect(getMockSession().close).toHaveBeenCalled();
      expect(result).toBe(mockResult);
    });

    it('should close session even on write error', async () => {
      await service.onModuleInit();
      getMockSession().run.mockRejectedValue(new Error('Write failed'));

      await expect(service.write('INVALID')).rejects.toThrow('Write failed');
      expect(getMockSession().close).toHaveBeenCalled();
    });
  });

  describe('healthCheck', () => {
    it('should return true when Neo4j is healthy', async () => {
      await service.onModuleInit();
      const mockRecord = {
        get: jest.fn((key: string) => {
          if (key === 'health') return { toNumber: () => 1 };
          return null;
        }),
      };
      getMockSession().run.mockResolvedValue({ records: [mockRecord] });

      const healthy = await service.healthCheck();
      expect(healthy).toBe(true);
    });

    it('should return false when Neo4j is unhealthy', async () => {
      await service.onModuleInit();
      getMockSession().run.mockRejectedValue(new Error('Connection refused'));

      const healthy = await service.healthCheck();
      expect(healthy).toBe(false);
    });

    it('should return false when query returns unexpected result', async () => {
      await service.onModuleInit();
      const mockRecord = {
        get: jest.fn((key: string) => {
          if (key === 'health') return { toNumber: () => 0 };
          return null;
        }),
      };
      getMockSession().run.mockResolvedValue({ records: [mockRecord] });

      const healthy = await service.healthCheck();
      expect(healthy).toBe(false);
    });
  });
});
