import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from '../health.controller';
import { HealthService } from '../health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: HealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: {
            checkFull: jest.fn(),
            checkLiveness: jest.fn(),
            checkReadiness: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthService = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('checkFull', () => {
    it('should delegate to healthService.checkFull', async () => {
      const expectedResponse = {
        status: 'ok' as const,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '0.0.1',
        checks: {},
      };
      jest.spyOn(healthService, 'checkFull').mockResolvedValue(expectedResponse);

      const result = await controller.checkFull();

      expect(result).toEqual(expectedResponse);
      expect(healthService.checkFull).toHaveBeenCalled();
    });
  });

  describe('checkLiveness', () => {
    it('should delegate to healthService.checkLiveness', () => {
      jest.spyOn(healthService, 'checkLiveness').mockReturnValue({ status: 'ok' });

      const result = controller.checkLiveness();

      expect(result).toEqual({ status: 'ok' });
      expect(healthService.checkLiveness).toHaveBeenCalled();
    });
  });

  describe('checkReadiness', () => {
    it('should delegate to healthService.checkReadiness', async () => {
      const expectedResponse = {
        status: 'ok' as const,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '0.0.1',
        checks: {},
      };
      jest.spyOn(healthService, 'checkReadiness').mockResolvedValue(expectedResponse);

      const result = await controller.checkReadiness();

      expect(result).toEqual(expectedResponse);
      expect(healthService.checkReadiness).toHaveBeenCalled();
    });
  });
});
