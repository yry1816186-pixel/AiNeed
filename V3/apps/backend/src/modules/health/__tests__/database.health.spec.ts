import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseHealthIndicator } from '../indicators/database.health';
import { PrismaService } from '../../../prisma/prisma.service';

describe('DatabaseHealthIndicator', () => {
  let indicator: DatabaseHealthIndicator;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseHealthIndicator,
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn(),
          },
        },
      ],
    }).compile();

    indicator = module.get<DatabaseHealthIndicator>(DatabaseHealthIndicator);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(indicator).toBeDefined();
  });

  it('should return healthy when SELECT 1 succeeds', async () => {
    jest.spyOn(prismaService, '$queryRaw').mockResolvedValue([{ '?column?': 1 }]);

    const result = await indicator.isHealthy('database');

    expect(result.database.status).toBe('up');
  });

  it('should throw HealthCheckError when query fails', async () => {
    jest.spyOn(prismaService, '$queryRaw').mockRejectedValue(new Error('Connection refused'));

    await expect(indicator.isHealthy('database')).rejects.toThrow('DatabaseHealthCheck failed');
  });
});
