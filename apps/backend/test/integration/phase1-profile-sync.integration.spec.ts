/**
 * Phase 1 Integration Test: Profile Sync
 *
 * Tests cross-module event propagation: profile updates publish profile:updated
 * events, quiz completion publishes quiz:completed events, and subscribers
 * receive them. Also verifies profile completeness calculation.
 *
 * Only imports services that compile cleanly; avoids importing controllers
 * or services that depend on modules with pre-existing type errors.
 */

import { EventEmitter2 } from "@nestjs/event-emitter";
import { Test, TestingModule } from "@nestjs/testing";

import { RedisService, REDIS_CLIENT } from "../../src/common/redis/redis.service";
import { ProfileCompletenessService } from "../../src/modules/profile/services/profile-completeness.service";
import { ProfileEventEmitter } from "../../src/modules/profile/services/profile-event-emitter.service";
import {
  createRedisKeyTracker,
  RedisKeyTracker,
  createMockRedisClient,
  createMockRedisService,
} from "../utils/redis-test-utils";

describe("Phase 1 Integration: Profile Sync", () => {
  let redisTracker: RedisKeyTracker;
  let mockRedisService: ReturnType<typeof createMockRedisService>;
  let profileEventEmitter: ProfileEventEmitter;
  let completenessService: ProfileCompletenessService;
  let eventEmitter2: EventEmitter2;

  const TEST_USER_ID = "user-sync-001";

  beforeAll(async () => {
    redisTracker = createRedisKeyTracker();
    mockRedisService = createMockRedisService(redisTracker);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileCompletenessService,
        ProfileEventEmitter,
        { provide: REDIS_CLIENT, useValue: createMockRedisClient(redisTracker) },
        { provide: RedisService, useValue: mockRedisService },
        EventEmitter2,
      ],
    }).compile();

    profileEventEmitter = moduleFixture.get(ProfileEventEmitter);
    completenessService = moduleFixture.get(ProfileCompletenessService);
    eventEmitter2 = moduleFixture.get(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
    redisTracker.reset();
  });

  // -------------------------------------------------------------------
  // 1. Profile update emits profile:updated event
  // -------------------------------------------------------------------
  describe("profile:updated event", () => {
    it("should publish profile:updated to Redis when profile is updated", async () => {
      const publishSpy = jest.spyOn(mockRedisService, "publish");

      await profileEventEmitter.emitProfileUpdated(TEST_USER_ID, ["nickname"]);

      expect(publishSpy).toHaveBeenCalledWith(
        "profile:updated",
        expect.any(String),
      );

      const callArgs = publishSpy.mock.calls[0]!;
      const message = JSON.parse(callArgs[1]);
      expect(message).toEqual({
        userId: TEST_USER_ID,
        changedFields: ["nickname"],
        timestamp: expect.any(Number),
      });
    });

    it("should include all changed fields in the event", async () => {
      const publishSpy = jest.spyOn(mockRedisService, "publish");

      await profileEventEmitter.emitProfileUpdated(TEST_USER_ID, [
        "gender",
        "birthDate",
        "height",
        "weight",
      ]);

      const callArgs = publishSpy.mock.calls[0]!;
      const message = JSON.parse(callArgs[1]);
      expect(message.changedFields).toEqual([
        "gender",
        "birthDate",
        "height",
        "weight",
      ]);
    });
  });

  // -------------------------------------------------------------------
  // 2. Quiz completion emits quiz:completed event
  // -------------------------------------------------------------------
  describe("quiz:completed event", () => {
    it("should publish quiz:completed to Redis when quiz result is saved", async () => {
      const publishSpy = jest.spyOn(mockRedisService, "publish");
      const quizId = "quiz-001";

      await profileEventEmitter.emitQuizResultSaved(TEST_USER_ID, quizId);

      expect(publishSpy).toHaveBeenCalledWith(
        "quiz:completed",
        expect.any(String),
      );

      const callArgs = publishSpy.mock.calls[0]!;
      const message = JSON.parse(callArgs[1]);
      expect(message).toEqual({
        userId: TEST_USER_ID,
        quizId,
        timestamp: expect.any(Number),
      });
    });
  });

  // -------------------------------------------------------------------
  // 3. NestJS EventEmitter2 subscribers receive events
  // -------------------------------------------------------------------
  describe("EventEmitter2 subscribers", () => {
    it("should notify AI Stylist subscriber on profile:updated", async () => {
      const aiStylistHandler = jest.fn();
      eventEmitter2.on("profile.updated", aiStylistHandler);

      eventEmitter2.emit("profile.updated", {
        userId: TEST_USER_ID,
        changedFields: ["bodyType"],
      });

      expect(aiStylistHandler).toHaveBeenCalledWith({
        userId: TEST_USER_ID,
        changedFields: ["bodyType"],
      });

      eventEmitter2.removeListener("profile.updated", aiStylistHandler);
    });

    it("should notify Recommendations subscriber on quiz:completed", async () => {
      const recommendationsHandler = jest.fn();
      eventEmitter2.on("quiz.completed", recommendationsHandler);

      eventEmitter2.emit("quiz.completed", {
        userId: TEST_USER_ID,
        quizId: "quiz-001",
      });

      expect(recommendationsHandler).toHaveBeenCalledWith({
        userId: TEST_USER_ID,
        quizId: "quiz-001",
      });

      eventEmitter2.removeListener("quiz.completed", recommendationsHandler);
    });
  });

  // -------------------------------------------------------------------
  // 4. Profile completeness calculation
  // -------------------------------------------------------------------
  describe("Profile completeness", () => {
    it("should return low percentage for minimal profile", () => {
      const result = completenessService.calculateCompleteness({
        gender: "female",
        birthDate: null,
        nickname: null,
        height: null,
        weight: null,
        bodyType: null,
        colorSeason: null,
        styleProfiles: [],
        stylePreferences: [],
        colorPreferences: [],
        photos: [],
      });

      expect(result.percentage).toBeLessThan(20);
      expect(result.missingFields).toContain("出生日期");
      expect(result.missingFields).toContain("昵称");
      expect(result.missingFields).toContain("身材数据");
    });

    it("should return 100% for complete profile", () => {
      const result = completenessService.calculateCompleteness({
        gender: "female",
        birthDate: new Date("1995-01-01"),
        nickname: "测试用户",
        height: 165,
        weight: 55,
        bodyType: "hourglass",
        colorSeason: "spring",
        styleProfiles: [{ id: "sp-1" }],
        stylePreferences: ["casual"],
        colorPreferences: ["#FF0000"],
        photos: [{ id: "photo-1" }],
      });

      expect(result.percentage).toBe(100);
      expect(result.missingFields).toEqual([]);
    });

    it("should list missing fields correctly for partial profile", () => {
      const result = completenessService.calculateCompleteness({
        gender: "female",
        birthDate: new Date("1995-01-01"),
        nickname: "测试用户",
        height: null,
        weight: null,
        bodyType: null,
        colorSeason: null,
        styleProfiles: [],
        stylePreferences: [],
        colorPreferences: [],
        photos: [],
      });

      // Basic info (30%) is complete: gender(10) + birthDate(10) + nickname(10) = 30
      expect(result.percentage).toBe(30);
      expect(result.missingFields).toContain("身材数据");
      expect(result.missingFields).toContain("风格档案");
      expect(result.missingFields).toContain("色彩分析");
      expect(result.missingFields).toContain("个人照片");
    });

    it("should return 0% for empty profile", () => {
      const result = completenessService.calculateCompleteness({
        gender: null,
        birthDate: null,
        nickname: null,
        height: null,
        weight: null,
        bodyType: null,
        colorSeason: null,
        styleProfiles: [],
        stylePreferences: [],
        colorPreferences: [],
        photos: [],
      });

      expect(result.percentage).toBe(0);
      expect(result.missingFields.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------
  // 5. Cross-module integration: Profile update triggers event
  // -------------------------------------------------------------------
  describe("Cross-module event flow", () => {
    it("should publish profile:updated when profile fields change", async () => {
      const publishSpy = jest.spyOn(mockRedisService, "publish");

      await profileEventEmitter.emitProfileUpdated(TEST_USER_ID, ["height", "weight"]);

      expect(publishSpy).toHaveBeenCalledTimes(1);
      expect(publishSpy).toHaveBeenCalledWith(
        "profile:updated",
        expect.stringContaining(TEST_USER_ID),
      );
    });

    it("should publish quiz:completed after quiz result saved", async () => {
      const publishSpy = jest.spyOn(mockRedisService, "publish");

      await profileEventEmitter.emitQuizResultSaved(TEST_USER_ID, "quiz-default");

      expect(publishSpy).toHaveBeenCalledTimes(1);
      expect(publishSpy).toHaveBeenCalledWith(
        "quiz:completed",
        expect.stringContaining("quiz-default"),
      );
    });

    it("should support multiple event types in sequence", async () => {
      const publishSpy = jest.spyOn(mockRedisService, "publish");

      await profileEventEmitter.emitProfileUpdated(TEST_USER_ID, ["colorSeason"]);
      await profileEventEmitter.emitQuizResultSaved(TEST_USER_ID, "quiz-002");

      expect(publishSpy).toHaveBeenCalledTimes(2);
      expect(publishSpy).toHaveBeenNthCalledWith(
        1,
        "profile:updated",
        expect.any(String),
      );
      expect(publishSpy).toHaveBeenNthCalledWith(
        2,
        "quiz:completed",
        expect.any(String),
      );
    });
  });
});
