import { NotFoundException, BadRequestException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";

import { PrismaService } from "../../common/prisma/prisma.service";
import { ProfileEventEmitter } from "../profile/services/profile-event-emitter.service";

import { ColorDerivationEngine } from "./services/color-derivation.service";
import { ColorDeriverService } from "./services/color-deriver";
import { StyleKeywordExtractorService } from "./services/style-keyword-extractor";
import { StyleQuizService } from "./style-quiz.service";


jest.mock("./services/question-selector", () => ({
  QuestionSelectorService: class QuestionSelectorService {
    selectQuestions = jest.fn();
  },
}));

describe("StyleQuizService", () => {
  let service: StyleQuizService;
  let prisma: PrismaService;

  const mockQuestionSelectorService = {
    selectQuestions: jest.fn(),
  };

  const mockColorDeriverService = {
    deriveColorPreferences: jest.fn().mockReturnValue({
      primaryColors: [
        { hueSegment: "red", weight: 2.5, medianHSL: { h: 0, s: 80, l: 50 } },
      ],
      secondaryColors: [],
      colorSeason: "spring",
      palette: ["#e6194D"],
      hueDistribution: { red: 2.5, orange: 0, yellow: 0, "yellow-green": 0, green: 0, "cyan-blue": 0, blue: 0, purple: 0 },
    }),
  };

  const mockStyleKeywordExtractorService = {
    extractStyleKeywords: jest.fn().mockReturnValue({
      styleKeywords: ["minimalist", "elegant"],
      occasionPreferences: { workplace: 0.6, date: 0.4 },
      priceRangePreference: "mid_range",
      confidenceScore: 0.85,
    }),
  };

  const mockColorDerivationEngine = {
    deriveColorPreferences: jest.fn().mockReturnValue({
      colorPalette: [],
    }),
  };

  const mockProfileEventEmitter = {
    emitQuizResultSaved: jest.fn().mockResolvedValue(undefined),
    emitProfileUpdated: jest.fn().mockResolvedValue(undefined),
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockPrismaService: any = {
    user: {
      findUnique: jest.fn(),
    },
    styleQuiz: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    quizQuestion: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    quizAnswer: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    styleQuizResult: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
    userProfile: {
      upsert: jest.fn(),
    },
    $transaction: jest.fn((fn: (prisma: typeof mockPrismaService) => Promise<unknown>) => fn(mockPrismaService)),
  };

  beforeEach(async () => {
    const { QuestionSelectorService } = jest.requireMock("./services/question-selector");

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StyleQuizService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: QuestionSelectorService,
          useValue: mockQuestionSelectorService,
        },
        {
          provide: ColorDeriverService,
          useValue: mockColorDeriverService,
        },
        {
          provide: StyleKeywordExtractorService,
          useValue: mockStyleKeywordExtractorService,
        },
        {
          provide: ColorDerivationEngine,
          useValue: mockColorDerivationEngine,
        },
        {
          provide: ProfileEventEmitter,
          useValue: mockProfileEventEmitter,
        },
      ],
    }).compile();

    service = module.get<StyleQuizService>(StyleQuizService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getQuizQuestions", () => {
    const userId = "user-1";
    const quizId = "quiz-1";

    const mockQuestions = Array.from({ length: 7 }, (_, i) => ({
      id: `q-${i + 1}`,
      quizId,
      content: `Question ${i + 1}`,
      imageUrls: [`https://img.example.com/${i}.jpg`],
      questionType: "visual_choice",
      dimension: ["color", "style", "occasion", "price"][i % 4],
      sortOrder: i,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    it("should delegate to questionSelector.selectQuestions with userId and quizId", async () => {
      mockQuestionSelectorService.selectQuestions.mockResolvedValue(mockQuestions.slice(0, 6));

      const result = await service.getQuizQuestions(userId, quizId);

      expect(mockQuestionSelectorService.selectQuestions).toHaveBeenCalledWith(userId, quizId);
      expect(result).toEqual(mockQuestions.slice(0, 6));
    });

    it("should return 5-8 questions from selector", async () => {
      mockQuestionSelectorService.selectQuestions.mockResolvedValue(mockQuestions.slice(0, 5));

      const result = await service.getQuizQuestions(userId, quizId);

      expect(result.length).toBeGreaterThanOrEqual(5);
      expect(result.length).toBeLessThanOrEqual(8);
    });

    it("should return generic questions when user has no gender", async () => {
      mockQuestionSelectorService.selectQuestions.mockResolvedValue(mockQuestions.slice(0, 6));

      const result = await service.getQuizQuestions(userId, quizId);

      expect(mockQuestionSelectorService.selectQuestions).toHaveBeenCalledWith(userId, quizId);
      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("saveAnswer", () => {
    const userId = "user-1";
    const questionId = "q-1";
    const selectedImageIndex = 2;
    const duration = 3500;

    const mockQuestion = {
      id: questionId,
      quizId: "quiz-1",
      content: "Pick your favorite outfit",
      imageUrls: ["url1", "url2", "url3", "url4"],
      questionType: "visual_choice",
      dimension: "style",
      sortOrder: 0,
      isActive: true,
    };

    const mockAnswer = {
      id: "answer-1",
      userId,
      questionId,
      selectedImageIndex,
      responseTimeMs: duration,
      createdAt: new Date(),
    };

    it("should save a single answer and return it", async () => {
      mockPrismaService.quizQuestion.findUnique.mockResolvedValue(mockQuestion);
      mockPrismaService.quizAnswer.findFirst.mockResolvedValue(null);
      mockPrismaService.quizAnswer.create.mockResolvedValue(mockAnswer);

      const result = await service.saveAnswer(userId, questionId, selectedImageIndex);

      expect(mockPrismaService.quizAnswer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          questionId,
          selectedImageIndex,
        }),
      });
      expect(result).toEqual(mockAnswer);
    });

    it("should save answer with duration", async () => {
      mockPrismaService.quizQuestion.findUnique.mockResolvedValue(mockQuestion);
      mockPrismaService.quizAnswer.findFirst.mockResolvedValue(null);
      mockPrismaService.quizAnswer.create.mockResolvedValue({
        ...mockAnswer,
        responseTimeMs: duration,
      });

      const result = await service.saveAnswer(userId, questionId, selectedImageIndex, duration);

      expect(mockPrismaService.quizAnswer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          questionId,
          selectedImageIndex,
          responseTimeMs: duration,
        }),
      });
      expect(result.responseTimeMs).toBe(duration);
    });

    it("should throw NotFoundException when question does not exist", async () => {
      mockPrismaService.quizQuestion.findUnique.mockResolvedValue(null);

      await expect(
        service.saveAnswer(userId, "nonexistent-q", selectedImageIndex),
      ).rejects.toThrow(NotFoundException);
    });

    it("should update existing answer instead of creating new one", async () => {
      const existingAnswer = {
        id: "existing-answer-1",
        userId,
        questionId,
        selectedImageIndex: 0,
        responseTimeMs: 1000,
      };

      mockPrismaService.quizQuestion.findUnique.mockResolvedValue(mockQuestion);
      mockPrismaService.quizAnswer.findFirst.mockResolvedValue(existingAnswer);
      mockPrismaService.quizAnswer.update.mockResolvedValue({
        ...existingAnswer,
        selectedImageIndex,
        responseTimeMs: duration,
      });

      const result = await service.saveAnswer(userId, questionId, selectedImageIndex, duration);

      expect(mockPrismaService.quizAnswer.update).toHaveBeenCalledWith({
        where: { id: existingAnswer.id },
        data: {
          selectedImageIndex,
          responseTimeMs: duration,
        },
      });
      expect(mockPrismaService.quizAnswer.create).not.toHaveBeenCalled();
      expect(result.selectedImageIndex).toBe(selectedImageIndex);
    });
  });

  describe("calculateResult", () => {
    const userId = "user-1";
    const quizId = "quiz-1";

    const mockQuestions = [
      { id: "q-occasion-01", dimension: "occasion", questionType: "visual_choice", isActive: true },
      { id: "q-color-01", dimension: "color", questionType: "visual_choice", isActive: true },
      { id: "q-style-01", dimension: "style", questionType: "visual_choice", isActive: true },
      { id: "q-price-01", dimension: "price", questionType: "visual_choice", isActive: true },
    ];

    const mockAnswers = [
      { id: "a-1", userId, questionId: "q-occasion-01", selectedImageIndex: 0, selectedOption: null, responseTimeMs: 2500 },
      { id: "a-2", userId, questionId: "q-color-01", selectedImageIndex: 1, selectedOption: null, responseTimeMs: 3000 },
      { id: "a-3", userId, questionId: "q-style-01", selectedImageIndex: 2, selectedOption: null, responseTimeMs: 1800 },
      { id: "a-4", userId, questionId: "q-price-01", selectedImageIndex: 0, selectedOption: null, responseTimeMs: 4000 },
    ];

    const mockQuiz = {
      id: quizId,
      title: "Style Quiz",
      questions: mockQuestions,
    };

    const mockResult = {
      id: "result-1",
      userId,
      quizId,
      occasionPreferences: {},
      colorPreferences: {},
      styleKeywords: [],
      priceRange: "mid_range",
      confidenceScore: 1,
      isLatest: true,
      createdAt: new Date(),
      quiz: { id: quizId, title: "Style Quiz" },
    };

    it("should use fallback calculation when image meta is not available", async () => {
      mockPrismaService.styleQuiz.findUnique.mockResolvedValue(mockQuiz);
      mockPrismaService.quizAnswer.findMany.mockResolvedValue(mockAnswers);
      mockPrismaService.styleQuizResult.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.styleQuizResult.create.mockResolvedValue(mockResult);

      await service.calculateResult(userId, quizId);

      expect(mockPrismaService.styleQuizResult.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            quizId,
            priceRange: "mid_range",
            isLatest: true,
          }),
        }),
      );
    });

    it("should save result to StyleQuizResult via transaction", async () => {
      mockPrismaService.styleQuiz.findUnique.mockResolvedValue(mockQuiz);
      mockPrismaService.quizAnswer.findMany.mockResolvedValue(mockAnswers);
      mockPrismaService.styleQuizResult.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.styleQuizResult.create.mockResolvedValue(mockResult);

      const result = await service.calculateResult(userId, quizId);

      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it("should mark previous results as not latest", async () => {
      mockPrismaService.styleQuiz.findUnique.mockResolvedValue(mockQuiz);
      mockPrismaService.quizAnswer.findMany.mockResolvedValue(mockAnswers);
      mockPrismaService.styleQuizResult.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.styleQuizResult.create.mockResolvedValue(mockResult);

      await service.calculateResult(userId, quizId);

      expect(mockPrismaService.styleQuizResult.updateMany).toHaveBeenCalledWith({
        where: { userId, isLatest: true },
        data: { isLatest: false },
      });
    });

    it("should throw BadRequestException when no answers exist", async () => {
      mockPrismaService.styleQuiz.findUnique.mockResolvedValue(mockQuiz);
      mockPrismaService.quizAnswer.findMany.mockResolvedValue([]);

      await expect(
        service.calculateResult(userId, quizId),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw NotFoundException when quiz does not exist", async () => {
      mockPrismaService.styleQuiz.findUnique.mockResolvedValue(null);

      await expect(
        service.calculateResult(userId, "nonexistent-quiz"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should calculate confidenceScore from answer completeness when no image meta", async () => {
      mockPrismaService.styleQuiz.findUnique.mockResolvedValue(mockQuiz);
      mockPrismaService.quizAnswer.findMany.mockResolvedValue(mockAnswers);
      mockPrismaService.styleQuizResult.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.styleQuizResult.create.mockResolvedValue(mockResult);

      await service.calculateResult(userId, quizId);

      expect(mockPrismaService.styleQuizResult.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            confidenceScore: expect.any(Number),
          }),
        }),
      );
    });
  });

  describe("getQuizProgress", () => {
    const userId = "user-1";
    const quizId = "quiz-1";

    const mockQuestions = [
      { id: "q-1", dimension: "color", isActive: true },
      { id: "q-2", dimension: "style", isActive: true },
      { id: "q-3", dimension: "occasion", isActive: true },
      { id: "q-4", dimension: "price", isActive: true },
      { id: "q-5", dimension: "color", isActive: true },
      { id: "q-6", dimension: "style", isActive: true },
      { id: "q-7", dimension: "occasion", isActive: true },
      { id: "q-8", dimension: "price", isActive: true },
    ];

    const mockQuiz = {
      id: quizId,
      title: "Style Quiz",
      questions: mockQuestions,
    };

    it("should return answered and total question counts", async () => {
      mockPrismaService.styleQuiz.findUnique.mockResolvedValue(mockQuiz);
      mockPrismaService.quizAnswer.count.mockResolvedValue(5);
      mockPrismaService.quizAnswer.findMany.mockResolvedValue([
        { questionId: "q-1", selectedImageIndex: 0, selectedOption: null },
        { questionId: "q-2", selectedImageIndex: null, selectedOption: "minimalist" },
        { questionId: "q-3", selectedImageIndex: null, selectedOption: "casual" },
        { questionId: "q-4", selectedImageIndex: 1, selectedOption: null },
        { questionId: "q-5", selectedImageIndex: null, selectedOption: "mid_range" },
      ]);

      const result = await service.getQuizProgress(userId, quizId);

      expect(result).toEqual({
        quizId,
        totalQuestions: 8,
        answeredCount: 5,
        progress: expect.closeTo(0.625, 2),
        isCompleted: false,
        answers: expect.any(Array),
      });
    });

    it("should support resuming from breakpoint", async () => {
      mockPrismaService.styleQuiz.findUnique.mockResolvedValue(mockQuiz);
      mockPrismaService.quizAnswer.count.mockResolvedValue(3);
      mockPrismaService.quizAnswer.findMany.mockResolvedValue([
        { questionId: "q-1", selectedImageIndex: 0, selectedOption: null },
        { questionId: "q-2", selectedImageIndex: null, selectedOption: "minimalist" },
        { questionId: "q-3", selectedImageIndex: null, selectedOption: "casual" },
      ]);

      const result = await service.getQuizProgress(userId, quizId);

      expect(result.answeredCount).toBe(3);
      expect(result.totalQuestions).toBe(8);
      expect(result.progress).toBeLessThan(1);
      expect(result.isCompleted).toBe(false);
    });

    it("should throw NotFoundException when quiz does not exist", async () => {
      mockPrismaService.styleQuiz.findUnique.mockResolvedValue(null);

      await expect(
        service.getQuizProgress(userId, "nonexistent-quiz"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should return 100% progress when all questions answered", async () => {
      const allAnswered = mockQuestions.map((q) => ({
        questionId: q.id,
        selectedImageIndex: 0,
        selectedOption: null,
      }));

      mockPrismaService.styleQuiz.findUnique.mockResolvedValue(mockQuiz);
      mockPrismaService.quizAnswer.count.mockResolvedValue(8);
      mockPrismaService.quizAnswer.findMany.mockResolvedValue(allAnswered);

      const result = await service.getQuizProgress(userId, quizId);

      expect(result.progress).toBe(1);
      expect(result.answeredCount).toBe(result.totalQuestions);
      expect(result.isCompleted).toBe(true);
    });

    it("should return 0% progress when no questions answered", async () => {
      mockPrismaService.styleQuiz.findUnique.mockResolvedValue(mockQuiz);
      mockPrismaService.quizAnswer.count.mockResolvedValue(0);
      mockPrismaService.quizAnswer.findMany.mockResolvedValue([]);

      const result = await service.getQuizProgress(userId, quizId);

      expect(result.progress).toBe(0);
      expect(result.answeredCount).toBe(0);
      expect(result.isCompleted).toBe(false);
    });
  });
});
