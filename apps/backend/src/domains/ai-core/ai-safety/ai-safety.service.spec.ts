import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';

import { AISafetyService, ValidationResult, ValidationContext } from './ai-safety.service';

describe('AISafetyService', () => {
  let service: AISafetyService;
  let httpService: HttpService;
  let configService: ConfigService;

  const mockDetectionCounter = { inc: jest.fn() };
  const mockHallucinationRate = { set: jest.fn() };
  const mockValidationLatency = { observe: jest.fn() };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config: Record<string, string> = {
        ML_SERVICE_URL: 'http://localhost:8001',
      };
      return config[key] ?? defaultValue;
    }),
  };

  const mockHttpService = {
    post: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AISafetyService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: HttpService, useValue: mockHttpService },
        { provide: 'PROM_METRIC_HALLUCINATION_DETECTION_TOTAL', useValue: mockDetectionCounter },
        { provide: 'PROM_METRIC_HALLUCINATION_RATE', useValue: mockHallucinationRate },
        { provide: 'PROM_METRIC_VALIDATION_LATENCY_SECONDS', useValue: mockValidationLatency },
      ],
    }).compile();

    service = module.get<AISafetyService>(AISafetyService);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateResponse', () => {
    it('应该返回有效结果当 ML 服务返回高置信度', async () => {
      const mockResponse = {
        data: {
          is_hallucination: false,
          confidence_score: 0.95,
          issues: [],
        },
      };
      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result: ValidationResult = await service.validateResponse(
        '建议穿白色衬衫搭配深色西裤',
        { occasion: 'business' },
      );

      expect(result.isValid).toBe(true);
      expect(result.confidenceScore).toBe(0.95);
      expect(result.issues).toEqual([]);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.validatedAt).toBeTruthy();
    });

    it('应该返回无效结果当检测到幻觉', async () => {
      const mockResponse = {
        data: {
          is_hallucination: true,
          confidence_score: 0.3,
          issues: [
            {
              type: 'factual_error',
              severity: 'error',
              description: 'Temperature claim is incorrect',
              confidence: 0.9,
            },
          ],
        },
      };
      mockHttpService.post.mockReturnValue(of(mockResponse));

      const result = await service.validateResponse(
        '今天30度，建议穿羽绒服',
        { temperature: 30 },
      );

      expect(result.isValid).toBe(false);
      expect(result.confidenceScore).toBe(0.3);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('应该在 ML 服务不可用时使用回退验证', async () => {
      mockHttpService.post.mockReturnValue(
        throwError(() => new Error('Connection refused')),
      );

      const result = await service.validateResponse(
        '建议穿短裤参加商务会议',
        { occasion: 'business' },
      );

      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues.some((i) => i.type === 'fashion_rule')).toBe(true);
    });

    it('应该在 ML 服务不可用时对温度不一致发出警告', async () => {
      mockHttpService.post.mockReturnValue(
        throwError(() => new Error('Connection refused')),
      );

      const result = await service.validateResponse(
        '今天气温5度，建议穿T恤',
        { temperature: 25 },
      );

      expect(result.issues.some((i) => i.type === 'numerical_error')).toBe(true);
    });

    it('应该在 ML 服务返回异常时返回保守的无效结果', async () => {
      mockHttpService.post.mockReturnValue(
        throwError(() => new Error('Unexpected error')),
      );

      const result = await service.validateResponse('正常回复', {});

      expect(result.isValid).toBe(true);
      expect(result.confidenceScore).toBeLessThan(1);
    });
  });

  describe('validateAndCorrect', () => {
    it('应该在检测到严重问题时添加警告前缀', async () => {
      const mockResponse = {
        data: {
          is_hallucination: true,
          confidence_score: 0.2,
          issues: [
            {
              type: 'factual_error',
              severity: 'error',
              description: '严重事实错误',
              confidence: 0.9,
            },
          ],
        },
      };
      mockHttpService.post.mockReturnValue(of(mockResponse));

      const { correctedResponse, validation } = await service.validateAndCorrect(
        '建议穿羽绒服去海边',
        {},
      );

      expect(validation.isValid).toBe(false);
      expect(correctedResponse).toContain('提示');
    });

    it('应该在结果有效时保持原样', async () => {
      const mockResponse = {
        data: {
          is_hallucination: false,
          confidence_score: 0.9,
          issues: [],
        },
      };
      mockHttpService.post.mockReturnValue(of(mockResponse));

      const original = '建议穿白色衬衫搭配深色西裤';
      const { correctedResponse, validation } = await service.validateAndCorrect(
        original,
        {},
      );

      expect(validation.isValid).toBe(true);
      expect(correctedResponse).toBe(original);
    });
  });

  describe('quickCheck', () => {
    it('应该对包含绝对性词语的回复返回 false', async () => {
      const result = await service.quickCheck('你绝对必须穿这件衣服');
      expect(result).toBe(false);
    });

    it('应该对包含英文绝对性词语的回复返回 false', async () => {
      const result = await service.quickCheck('You must always wear this');
      expect(result).toBe(false);
    });

    it('应该对正常回复返回 true', async () => {
      const result = await service.quickCheck('建议穿白色衬衫搭配深色西裤');
      expect(result).toBe(true);
    });

    it('应该对包含异常高价位的回复返回 false', async () => {
      const result = await service.quickCheck('这件衣服售价$1000000');
      expect(result).toBe(false);
    });
  });

  describe('getStatistics', () => {
    it('应该返回统计信息结构', async () => {
      const stats = await service.getStatistics();

      expect(stats).toHaveProperty('totalDetections');
      expect(stats).toHaveProperty('hallucinationRate');
      expect(stats).toHaveProperty('averageConfidence');
      expect(stats).toHaveProperty('issuesByType');
      expect(stats).toHaveProperty('issuesBySeverity');
    });
  });
});
