import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Neo4jService } from '../neo4j.service';

describe('Neo4jService', () => {
  let service: Neo4jService;
  let configService: ConfigService;

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

  const mockSession = {
    run: jest.fn(),
    close: jest.fn().mockResolvedValue(undefined),
  };

  const mockDriver = {
    session: jest.fn(() => mockSession),
    verifyConnectivity: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
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
    configService = module.get<ConfigService>(ConfigService);

    (service as unknown as { driver: unknown }).driver = mockDriver;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should initialize driver with config values', async () => {
      const driverSpy = jest.spyOn(require('neo4j-driver'), 'driver').mockReturnValue(mockDriver);
      await service.onModuleInit();

      expect(configService.get).toHaveBeenCalledWith('NEO4J_URL');
      expect(configService.get).toHaveBeenCalledWith('NEO4J_USER');
      expect(configService.get).toHaveBeenCalledWith('NEO4J_PASSWORD');
      driverSpy.mockRestore();
    });

    it('should use default values when config is missing', async () => {
      mockConfigService.get.mockReturnValue(undefined);
      const driverSpy = jest.spyOn(require('neo4j-driver'), 'driver').mockReturnValue(mockDriver);
      await service.onModuleInit();

      expect(driverSpy).toHaveBeenCalledWith(
        'bolt://localhost:7687',
        expect.anything(),
        expect.any(Object),
      );
      driverSpy.mockRestore();
    });
  });

  describe('onModuleDestroy', () => {
    it('should close the driver', async () => {
      await service.onModuleDestroy();
      expect(mockDriver.close).toHaveBeenCalled();
    });

    it('should handle null driver gracefully', async () => {
      (service as unknown as { driver: unknown }).driver = null;
      await expect(service.onModuleDestroy()).resolves.not.toThrow();
    });
  });

  describe('getDriver', () => {
    it('should return the driver when initialized', () => {
      const driver = service.getDriver();
      expect(driver).toBe(mockDriver);
    });

    it('should throw when driver is not initialized', () => {
      (service as unknown as { driver: unknown }).driver = null;
      expect(() => service.getDriver()).toThrow('Neo4j driver not initialized');
    });
  });

  describe('getReadSession', () => {
    it('should return a read session', () => {
      const session = service.getReadSession();
      expect(mockDriver.session).toHaveBeenCalledWith(
        expect.objectContaining({ accessMode: 'READ' }),
      );
      expect(session).toBe(mockSession);
    });
  });

  describe('getWriteSession', () => {
    it('should return a write session', () => {
      const session = service.getWriteSession();
      expect(mockDriver.session).toHaveBeenCalledWith(
        expect.objectContaining({ accessMode: 'WRITE' }),
      );
      expect(session).toBe(mockSession);
    });
  });

  describe('read', () => {
    it('should execute read query and close session', async () => {
      const mockResult = { records: [], summary: {} };
      mockSession.run.mockResolvedValue(mockResult);

      const result = await service.read('MATCH (n) RETURN n', { limit: 10 });

      expect(mockSession.run).toHaveBeenCalledWith('MATCH (n) RETURN n', { limit: 10 });
      expect(mockSession.close).toHaveBeenCalled();
      expect(result).toBe(mockResult);
    });

    it('should close session even on error', async () => {
      mockSession.run.mockRejectedValue(new Error('Query failed'));

      await expect(service.read('INVALID CYPHER')).rejects.toThrow('Query failed');
      expect(mockSession.close).toHaveBeenCalled();
    });
  });

  describe('write', () => {
    it('should execute write query and close session', async () => {
      const mockResult = { records: [], summary: {} };
      mockSession.run.mockResolvedValue(mockResult);

      const result = await service.write('CREATE (n:Test) RETURN n', { name: 'test' });

      expect(mockSession.run).toHaveBeenCalledWith('CREATE (n:Test) RETURN n', { name: 'test' });
      expect(mockSession.close).toHaveBeenCalled();
      expect(result).toBe(mockResult);
    });

    it('should close session even on write error', async () => {
      mockSession.run.mockRejectedValue(new Error('Write failed'));

      await expect(service.write('INVALID')).rejects.toThrow('Write failed');
      expect(mockSession.close).toHaveBeenCalled();
    });
  });

  describe('healthCheck', () => {
    it('should return true when Neo4j is healthy', async () => {
      const mockRecord = {
        get: jest.fn((key: string) => {
          if (key === 'health') return { toNumber: () => 1 };
          return null;
        }),
      };
      mockSession.run.mockResolvedValue({ records: [mockRecord] });

      const healthy = await service.healthCheck();
      expect(healthy).toBe(true);
    });

    it('should return false when Neo4j is unhealthy', async () => {
      mockSession.run.mockRejectedValue(new Error('Connection refused'));

      const healthy = await service.healthCheck();
      expect(healthy).toBe(false);
    });

    it('should return false when query returns unexpected result', async () => {
      const mockRecord = {
        get: jest.fn((key: string) => {
          if (key === 'health') return { toNumber: () => 0 };
          return null;
        }),
      };
      mockSession.run.mockResolvedValue({ records: [mockRecord] });

      const healthy = await service.healthCheck();
      expect(healthy).toBe(false);
    });
  });
});
