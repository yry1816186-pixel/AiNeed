import { Test, TestingModule } from "@nestjs/testing";

import { RedisService } from "../../../../../common/redis/redis.service";

import { QuizProgressService, QuizProgress } from "./quiz-progress.service";

describe("QuizProgressService", () => {
  let service: QuizProgressService;
  let redisService: { get: jest.Mock; setex: jest.Mock; del: jest.Mock };

  beforeEach(async () => {
    redisService = {
      get: jest.fn().mockResolvedValue(null),
      setex: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizProgressService,
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    service = module.get<QuizProgressService>(QuizProgressService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("saveProgress", () => {
    it("should store progress in Redis with 24h TTL", async () => {
      const answers: Record<string, string> = { q1: "a1", q2: "a2" };

      await service.saveProgress("user-1", "quiz-1", 3, answers);

      expect(redisService.setex).toHaveBeenCalledTimes(1);
      const [key, ttl, value] = redisService.setex.mock.calls[0] as [string, number, string];

      expect(key).toBe("quiz:progress:user-1:quiz-1");
      expect(ttl).toBe(86400); // 24 hours

      const parsed = JSON.parse(value);
      expect(parsed.questionIndex).toBe(3);
      expect(parsed.answers).toEqual({ q1: "a1", q2: "a2" });
      expect(parsed.updatedAt).toBeGreaterThan(0);
    });
  });

  describe("getProgress", () => {
    it("should return parsed progress when found in Redis", async () => {
      const storedProgress: QuizProgress = {
        questionIndex: 2,
        answers: { q1: "a1" },
        updatedAt: Date.now(),
      };
      redisService.get.mockResolvedValue(JSON.stringify(storedProgress));

      const result = await service.getProgress("user-1", "quiz-1");

      expect(result).not.toBeNull();
      expect(result!.questionIndex).toBe(2);
      expect(result!.answers).toEqual({ q1: "a1" });
    });

    it("should return null when no progress found", async () => {
      redisService.get.mockResolvedValue(null);

      const result = await service.getProgress("user-1", "quiz-1");

      expect(result).toBeNull();
    });

    it("should return null when stored value is invalid JSON", async () => {
      redisService.get.mockResolvedValue("not-json");

      const result = await service.getProgress("user-1", "quiz-1");

      expect(result).toBeNull();
    });
  });

  describe("clearProgress", () => {
    it("should delete the Redis key", async () => {
      await service.clearProgress("user-1", "quiz-1");

      expect(redisService.del).toHaveBeenCalledWith("quiz:progress:user-1:quiz-1");
    });
  });
});
