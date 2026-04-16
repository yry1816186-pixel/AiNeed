/* eslint-disable @typescript-eslint/no-explicit-any */
import { Test, TestingModule } from "@nestjs/testing";

import { RedisService } from "../../../../../../../common/redis/redis.service";

import { ProfileEventEmitter } from "./profile-event-emitter.service";

describe("ProfileEventEmitter", () => {
  let service: ProfileEventEmitter;
  let redisService: { publish: jest.Mock };

  beforeEach(async () => {
    redisService = {
      publish: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileEventEmitter,
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    service = module.get<ProfileEventEmitter>(ProfileEventEmitter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("emitProfileUpdated", () => {
    it("should publish to profile:updated Redis channel", async () => {
      await service.emitProfileUpdated("user-1", ["nickname", "avatar"]);

      expect(redisService.publish).toHaveBeenCalledTimes(1);
      const [channel, message] = redisService.publish.mock.calls[0] as [string, string];

      expect(channel).toBe("profile:updated");

      const parsed = JSON.parse(message);
      expect(parsed.userId).toBe("user-1");
      expect(parsed.changedFields).toEqual(["nickname", "avatar"]);
      expect(parsed.timestamp).toBeGreaterThan(0);
    });

    it("should include userId, changedFields, and timestamp in message", async () => {
      await service.emitProfileUpdated("user-2", ["colorSeason"]);

      const message = JSON.parse(redisService.publish.mock.calls[0][1] as string);
      expect(message).toHaveProperty("userId", "user-2");
      expect(message).toHaveProperty("changedFields");
      expect(message).toHaveProperty("timestamp");
      expect(typeof message.timestamp).toBe("number");
    });
  });

  describe("emitQuizResultSaved", () => {
    it("should publish to quiz:completed Redis channel", async () => {
      await service.emitQuizResultSaved("user-1", "quiz-1");

      expect(redisService.publish).toHaveBeenCalledTimes(1);
      const [channel, message] = redisService.publish.mock.calls[0] as [string, string];

      expect(channel).toBe("quiz:completed");

      const parsed = JSON.parse(message);
      expect(parsed.userId).toBe("user-1");
      expect(parsed.quizId).toBe("quiz-1");
      expect(parsed.timestamp).toBeGreaterThan(0);
    });

    it("should include userId, quizId, and timestamp in message", async () => {
      await service.emitQuizResultSaved("user-3", "quiz-42");

      const message = JSON.parse(redisService.publish.mock.calls[0][1] as string);
      expect(message).toHaveProperty("userId", "user-3");
      expect(message).toHaveProperty("quizId", "quiz-42");
      expect(message).toHaveProperty("timestamp");
      expect(typeof message.timestamp).toBe("number");
    });
  });
});
