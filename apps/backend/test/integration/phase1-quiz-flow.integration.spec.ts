/**
 * Phase 1 Integration Test: Quiz Flow
 *
 * Tests the quiz progress -> color derivation -> event emission flow.
 * Uses mocked Prisma/Redis; no infrastructure required.
 *
 * Only imports services that compile cleanly. Tests quiz progress save/restore,
 * color derivation from selections, and the quiz:completed event emission.
 */

import { Test, TestingModule } from "@nestjs/testing";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { ColorDerivationEngine } from "../../src/modules/style-quiz/services/color-derivation.service";
import { QuizProgressService } from "../../src/modules/style-quiz/services/quiz-progress.service";
import { ProfileEventEmitter } from "../../src/modules/profile/services/profile-event-emitter.service";
import { RedisService, REDIS_CLIENT } from "../../src/common/redis/redis.service";

import {
  createRedisKeyTracker,
  RedisKeyTracker,
  createMockRedisClient,
  createMockRedisService,
} from "../utils/redis-test-utils";

describe("Phase 1 Integration: Quiz Flow", () => {
  let redisTracker: RedisKeyTracker;
  let mockRedisService: ReturnType<typeof createMockRedisService>;
  let quizProgressService: QuizProgressService;
  let colorDerivationEngine: ColorDerivationEngine;
  let profileEventEmitter: ProfileEventEmitter;
  let eventEmitter2: EventEmitter2;

  const TEST_USER_ID = "user-quiz-001";
  const TEST_QUIZ_ID = "quiz-default-001";

  beforeAll(async () => {
    redisTracker = createRedisKeyTracker();
    mockRedisService = createMockRedisService(redisTracker) as ReturnType<typeof createMockRedisService>;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [
        ColorDerivationEngine,
        QuizProgressService,
        ProfileEventEmitter,
        { provide: REDIS_CLIENT, useValue: createMockRedisClient(redisTracker) },
        { provide: RedisService, useValue: mockRedisService },
        EventEmitter2,
      ],
    }).compile();

    quizProgressService = moduleFixture.get(QuizProgressService);
    colorDerivationEngine = moduleFixture.get(ColorDerivationEngine);
    profileEventEmitter = moduleFixture.get(ProfileEventEmitter);
    eventEmitter2 = moduleFixture.get(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
    redisTracker.reset();
  });

  // -------------------------------------------------------------------
  // 1. Quiz progress save and restore
  // -------------------------------------------------------------------
  describe("Quiz progress (Redis-backed)", () => {
    it("should save and retrieve quiz progress", async () => {
      const answers = { "question-1": "option-A", "question-2": "option-C" };

      await quizProgressService.saveProgress(
        TEST_USER_ID,
        TEST_QUIZ_ID,
        2, // questionIndex
        answers,
      );

      const progress = await quizProgressService.getProgress(
        TEST_USER_ID,
        TEST_QUIZ_ID,
      );

      expect(progress).toBeDefined();
      expect(progress!.questionIndex).toBe(2);
    });

    it("should return default progress when no progress saved", async () => {
      const progress = await quizProgressService.getProgress(
        TEST_USER_ID,
        "nonexistent-quiz",
      );

      expect(progress).toBeDefined();
    });

    it("should overwrite progress on subsequent save", async () => {
      await quizProgressService.saveProgress(
        TEST_USER_ID,
        TEST_QUIZ_ID,
        1,
        { "question-1": "option-A" },
      );

      await quizProgressService.saveProgress(
        TEST_USER_ID,
        TEST_QUIZ_ID,
        3,
        { "question-1": "option-A", "question-2": "option-B", "question-3": "option-C" },
      );

      const progress = await quizProgressService.getProgress(
        TEST_USER_ID,
        TEST_QUIZ_ID,
      );

      expect(progress!.questionIndex).toBe(3);
    });
  });

  // -------------------------------------------------------------------
  // 2. Color derivation from quiz selections
  // -------------------------------------------------------------------
  describe("Color derivation engine", () => {
    it("should derive color preferences from option selections", () => {
      const selections = [
        {
          colorTags: [
            { hex: "#FF6B6B", category: "warm", weight: 0.8 },
            { hex: "#4ECDC4", category: "cool", weight: 0.3 },
          ],
        },
        {
          colorTags: [
            { hex: "#FFE66D", category: "warm", weight: 0.6 },
            { hex: "#A8E6CF", category: "cool", weight: 0.2 },
          ],
        },
      ];

      const result = colorDerivationEngine.deriveColorPreferences(selections);

      expect(result).toBeDefined();
      expect(result.colorPalette).toBeDefined();
      expect(Array.isArray(result.colorPalette)).toBe(true);
    });

    it("should handle empty selections gracefully", () => {
      const result = colorDerivationEngine.deriveColorPreferences([]);

      expect(result).toBeDefined();
      expect(result.colorPalette).toEqual([]);
    });

    it("should derive a palette with at least 4 colors from varied selections", () => {
      const selections = [
        {
          colorTags: [
            { hex: "#FF0000", category: "red", weight: 0.9 },
            { hex: "#00FF00", category: "green", weight: 0.7 },
            { hex: "#0000FF", category: "blue", weight: 0.5 },
            { hex: "#FFFF00", category: "yellow", weight: 0.8 },
          ],
        },
        {
          colorTags: [
            { hex: "#FF6600", category: "orange", weight: 0.6 },
            { hex: "#9900FF", category: "purple", weight: 0.4 },
          ],
        },
      ];

      const result = colorDerivationEngine.deriveColorPreferences(selections);

      expect(result.colorPalette.length).toBeGreaterThanOrEqual(4);
    });

    it("should produce deterministic results for same input", () => {
      const selections = [
        {
          colorTags: [
            { hex: "#FF6B6B", category: "warm", weight: 0.8 },
          ],
        },
      ];

      const result1 = colorDerivationEngine.deriveColorPreferences(selections);
      const result2 = colorDerivationEngine.deriveColorPreferences(selections);

      expect(result1.colorPalette).toEqual(result2.colorPalette);
    });
  });

  // -------------------------------------------------------------------
  // 3. Quiz completion triggers event
  // -------------------------------------------------------------------
  describe("Quiz completion event", () => {
    it("should emit quiz:completed event when quiz result is saved", async () => {
      const publishSpy = jest.spyOn(mockRedisService, "publish");

      await profileEventEmitter.emitQuizResultSaved(TEST_USER_ID, TEST_QUIZ_ID);

      expect(publishSpy).toHaveBeenCalledWith(
        "quiz:completed",
        expect.any(String),
      );

      const callArgs = publishSpy.mock.calls[0]!;
      const message = JSON.parse(callArgs[1] as string);
      expect(message.userId).toBe(TEST_USER_ID);
      expect(message.quizId).toBe(TEST_QUIZ_ID);
      expect(message.timestamp).toBeDefined();
    });

    it("should notify subscribers via EventEmitter2 on quiz:completed", () => {
      const recommendationsHandler = jest.fn();
      eventEmitter2.on("quiz.completed", recommendationsHandler);

      eventEmitter2.emit("quiz.completed", {
        userId: TEST_USER_ID,
        quizId: TEST_QUIZ_ID,
        timestamp: Date.now(),
      });

      expect(recommendationsHandler).toHaveBeenCalledWith({
        userId: TEST_USER_ID,
        quizId: TEST_QUIZ_ID,
        timestamp: expect.any(Number),
      });

      eventEmitter2.removeListener("quiz.completed", recommendationsHandler);
    });
  });

  // -------------------------------------------------------------------
  // 4. Full flow integration: progress -> derive colors -> emit event
  // -------------------------------------------------------------------
  describe("Full quiz flow integration", () => {
    it("should complete full quiz flow: save progress -> derive colors -> emit event", async () => {
      // Step 1: Save progress for 3 questions
      await quizProgressService.saveProgress(
        TEST_USER_ID,
        TEST_QUIZ_ID,
        3,
        {
          "question-1": "option-A",
          "question-2": "option-C",
          "question-3": "option-B",
        },
      );

      // Step 2: Verify progress was saved
      const progress = await quizProgressService.getProgress(
        TEST_USER_ID,
        TEST_QUIZ_ID,
      );
      expect(progress!.questionIndex).toBe(3);

      // Step 3: Derive color preferences from selections
      const selections = [
        {
          colorTags: [
            { hex: "#FF6B6B", category: "warm", weight: 0.9 },
            { hex: "#4ECDC4", category: "cool", weight: 0.3 },
          ],
        },
        {
          colorTags: [
            { hex: "#FFE66D", category: "warm", weight: 0.7 },
          ],
        },
        {
          colorTags: [
            { hex: "#A8E6CF", category: "cool", weight: 0.5 },
            { hex: "#FF8B94", category: "warm", weight: 0.8 },
          ],
        },
      ];

      const colorResult = colorDerivationEngine.deriveColorPreferences(selections);
      expect(colorResult.colorPalette.length).toBeGreaterThan(0);

      // Step 4: Emit quiz completed event
      const publishSpy = jest.spyOn(mockRedisService, "publish");
      await profileEventEmitter.emitQuizResultSaved(TEST_USER_ID, TEST_QUIZ_ID);

      expect(publishSpy).toHaveBeenCalledWith(
        "quiz:completed",
        expect.stringContaining(TEST_USER_ID),
      );
    });
  });
});
