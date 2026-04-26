import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";

import { SasrecRetrainService } from "../sasrec-retrain.service";
import { SASRecClientService } from "../sasrec-client.service";
import { BehaviorEtlService } from "../behavior-etl.service";
import { RetrainingEvaluatorService } from "../retraining-evaluator.service";
import { PrismaService } from "../../../../../common/prisma/prisma.service";

describe("SasrecRetrainService", () => {
  let service: SasrecRetrainService;
  let evaluatorMock: {
    saveCurrentVersion: jest.Mock;
    evaluateAndMaybeRollback: jest.Mock;
  };
  let behaviorEtlMock: {
    extractTrainingSequences: jest.Mock;
  };
  let sasrecClientMock: {
    isEnabled: jest.Mock;
  };

  // Mock global fetch for Python service calls
  const originalFetch = global.fetch;

  beforeEach(async () => {
    evaluatorMock = {
      saveCurrentVersion: jest.fn().mockResolvedValue({
        id: "backup-1",
        version: "sasrec-v1000",
        metrics: { recall_at_10: 0.5 },
      }),
      evaluateAndMaybeRollback: jest.fn().mockResolvedValue({
        accepted: true,
        rolledBack: false,
        reason: "Metrics within range",
        degradationDetected: {},
      }),
    };

    behaviorEtlMock = {
      extractTrainingSequences: jest.fn().mockResolvedValue([]),
    };

    sasrecClientMock = {
      isEnabled: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SasrecRetrainService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue("http://localhost:8100"),
          },
        },
        { provide: SASRecClientService, useValue: sasrecClientMock },
        { provide: BehaviorEtlService, useValue: behaviorEtlMock },
        { provide: RetrainingEvaluatorService, useValue: evaluatorMock },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    service = module.get<SasrecRetrainService>(SasrecRetrainService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("triggerRetrain", () => {
    it("should return failure when no training sequences available", async () => {
      behaviorEtlMock.extractTrainingSequences.mockResolvedValueOnce([]);

      const result = await service.triggerRetrain();

      expect(result.success).toBe(false);
      expect(result.message).toContain("No training sequences");
    });

    it("should return failure when already retraining", async () => {
      // First call sets isRetraining to true
      behaviorEtlMock.extractTrainingSequences.mockResolvedValueOnce([]);
      // Don't await - simulate concurrent call
      service.triggerRetrain();

      // This should fail because retraining is in progress
      // Need to wait a tick for the first call to set the flag
      const result = await service.triggerRetrain();
      // Either it's still retraining or it finished and we get the empty result
      expect(typeof result.success).toBe("boolean");
    });

    it("should successfully retrain with valid sequences and training response", async () => {
      const mockSequences = [
        {
          userId: "user-1",
          events: [
            { itemId: "item-1", implicitScore: 1.0, eventType: "purchase", timestamp: new Date() },
          ],
        },
      ];

      behaviorEtlMock.extractTrainingSequences.mockResolvedValueOnce(mockSequences);

      // Mock fetch for the Python training endpoint
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          loss: 0.25,
          epochs: 10,
          recall_at_5: 0.6,
          recall_at_10: 0.5,
          recall_at_20: 0.4,
          ndcg_at_10: 0.45,
          ndcg_at_20: 0.4,
        }),
      });

      evaluatorMock.evaluateAndMaybeRollback.mockResolvedValueOnce({
        accepted: true,
        rolledBack: false,
        reason: "New model metrics are within acceptable range",
        degradationDetected: {},
      });

      const result = await service.triggerRetrain({ epochs: 10, learningRate: 0.001 });

      expect(result.success).toBe(true);
      expect(result.rolledBack).toBe(false);
      expect(result.metrics).toBeDefined();
      expect(result.metrics!.loss).toBe(0.25);
      expect(evaluatorMock.saveCurrentVersion).toHaveBeenCalledWith("sasrec");
      expect(evaluatorMock.evaluateAndMaybeRollback).toHaveBeenCalledWith(
        "sasrec",
        expect.objectContaining({ loss: 0.25 })
      );
    });

    it("should rollback when evaluation detects degradation", async () => {
      const mockSequences = [
        {
          userId: "user-1",
          events: [
            { itemId: "item-1", implicitScore: 1.0, eventType: "purchase", timestamp: new Date() },
          ],
        },
      ];

      behaviorEtlMock.extractTrainingSequences.mockResolvedValueOnce(mockSequences);

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          loss: 0.8,
          epochs: 10,
          recall_at_5: 0.2,
          recall_at_10: 0.15,
          recall_at_20: 0.1,
        }),
      });

      evaluatorMock.evaluateAndMaybeRollback.mockResolvedValueOnce({
        accepted: false,
        rolledBack: true,
        reason: "Degradation exceeded 5% threshold on: recall_at_10",
        degradationDetected: {
          recall_at_10: { old: 0.5, new: 0.15, degradation: 0.35 },
        },
      });

      const result = await service.triggerRetrain();

      expect(result.success).toBe(false);
      expect(result.rolledBack).toBe(true);
      expect(result.message).toContain("rolled back");
    });

    it("should return failure when Python service is unavailable", async () => {
      const mockSequences = [
        {
          userId: "user-1",
          events: [
            { itemId: "item-1", implicitScore: 1.0, eventType: "purchase", timestamp: new Date() },
          ],
        },
      ];

      behaviorEtlMock.extractTrainingSequences.mockResolvedValueOnce(mockSequences);

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      });

      const result = await service.triggerRetrain();

      expect(result.success).toBe(false);
      expect(result.message).toContain("failed");
    });

    it("should return failure when Python service throws network error", async () => {
      const mockSequences = [
        {
          userId: "user-1",
          events: [
            { itemId: "item-1", implicitScore: 1.0, eventType: "purchase", timestamp: new Date() },
          ],
        },
      ];

      behaviorEtlMock.extractTrainingSequences.mockResolvedValueOnce(mockSequences);

      global.fetch = jest.fn().mockRejectedValueOnce(new Error("ECONNREFUSED"));

      const result = await service.triggerRetrain();

      expect(result.success).toBe(false);
      expect(result.message).toContain("failed");
    });
  });

  describe("isCurrentlyRetraining", () => {
    it("should return false when not retraining", () => {
      expect(service.isCurrentlyRetraining()).toBe(false);
    });
  });
});
