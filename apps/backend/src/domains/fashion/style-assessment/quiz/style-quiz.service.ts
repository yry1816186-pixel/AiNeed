import { Injectable, Logger, NotFoundException, BadRequestException, Optional } from "@nestjs/common";
import { Prisma, PriceRange } from "@prisma/client";

import { PrismaService } from "../../../../common/prisma/prisma.service";
import {
  PaginatedResponse,
  createPaginatedResponse,
  normalizePaginationParams,
} from "../../../../common/types/api-response.types";
import { OnboardingService } from "../../../../domains/identity/onboarding/onboarding.service";
import { ProfileEventEmitter } from "../../../../domains/identity/profile/services/profile-event-emitter.service";

import {
  CreateStyleQuizDto,
  UpdateStyleQuizDto,
  CreateQuizQuestionDto,
  UpdateQuizQuestionDto,
  SubmitQuizAnswerDto,
  BatchSubmitAnswersDto,
  QuizResultQueryDto,
  StyleQuizQueryDto,
  QuizQuestionQueryDto,
} from "./dto/style-quiz.dto";
import { ColorDerivationEngine } from "./services/color-derivation.service";
import { ColorDeriverService } from "./services/color-deriver";
import { QuestionSelectorService, QuizQuestionWithMeta, SelectedImageWithMeta, QuizImageMeta, QUESTION_IMAGE_META_MAP } from "./services/question-selector";
import { StyleKeywordExtractorService } from "./services/style-keyword-extractor";



@Injectable()
export class StyleQuizService {
  private readonly logger = new Logger(StyleQuizService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly questionSelector: QuestionSelectorService,
    private readonly colorDeriver: ColorDeriverService,
    private readonly styleKeywordExtractor: StyleKeywordExtractorService,
    private readonly colorDerivation: ColorDerivationEngine,
    private readonly eventEmitter: ProfileEventEmitter,
    @Optional() private readonly onboardingService: OnboardingService | null,
  ) {}

  // ==================== 问卷 CRUD ====================

  async createQuiz(dto: CreateStyleQuizDto) {
    return this.prisma.styleQuiz.create({
      data: {
        title: dto.title,
        description: dto.description,
        coverImage: dto.coverImage,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async getQuizzes(query: StyleQuizQueryDto): Promise<PaginatedResponse<Prisma.StyleQuizGetPayload<{ include: { _count: { select: { questions: true; results: true } } } }>>> {
    const { page = 1, pageSize = 20 } = normalizePaginationParams(query);

    const where: Prisma.StyleQuizWhereInput = {};
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const [items, total] = await Promise.all([
      this.prisma.styleQuiz.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: { select: { questions: true, results: true } },
        },
      }),
      this.prisma.styleQuiz.count({ where }),
    ]);

    return createPaginatedResponse(items, total, page, pageSize);
  }

  async getQuizById(quizId: string) {
    const quiz = await this.prisma.styleQuiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        },
        _count: { select: { results: true } },
      },
    });

    if (!quiz) {
      throw new NotFoundException("问卷不存在");
    }

    return quiz;
  }

  async updateQuiz(quizId: string, dto: UpdateStyleQuizDto) {
    const existing = await this.prisma.styleQuiz.findUnique({
      where: { id: quizId },
    });

    if (!existing) {
      throw new NotFoundException("问卷不存在");
    }

    return this.prisma.styleQuiz.update({
      where: { id: quizId },
      data: {
        title: dto.title,
        description: dto.description,
        coverImage: dto.coverImage,
        isActive: dto.isActive,
      },
    });
  }

  async deleteQuiz(quizId: string) {
    const existing = await this.prisma.styleQuiz.findUnique({
      where: { id: quizId },
    });

    if (!existing) {
      throw new NotFoundException("问卷不存在");
    }

    await this.prisma.styleQuiz.delete({ where: { id: quizId } });
    return { success: true };
  }

  // ==================== 题目 CRUD ====================

  async createQuestion(dto: CreateQuizQuestionDto) {
    const quiz = await this.prisma.styleQuiz.findUnique({
      where: { id: dto.quizId },
    });

    if (!quiz) {
      throw new NotFoundException("问卷不存在");
    }

    return this.prisma.quizQuestion.create({
      data: {
        quizId: dto.quizId,
        content: dto.content,
        imageUrls: dto.imageUrls || [],
        questionType: dto.questionType,
        dimension: dto.dimension,
        sortOrder: dto.sortOrder,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async getQuestions(quizId: string, query: QuizQuestionQueryDto) {
    const where: Prisma.QuizQuestionWhereInput = { quizId };

    if (query.dimension) {
      where.dimension = query.dimension;
    }
    if (query.questionType) {
      where.questionType = query.questionType;
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    return this.prisma.quizQuestion.findMany({
      where,
      orderBy: { sortOrder: "asc" },
    });
  }

  async updateQuestion(questionId: string, dto: UpdateQuizQuestionDto) {
    const existing = await this.prisma.quizQuestion.findUnique({
      where: { id: questionId },
    });

    if (!existing) {
      throw new NotFoundException("题目不存在");
    }

    return this.prisma.quizQuestion.update({
      where: { id: questionId },
      data: {
        content: dto.content,
        imageUrls: dto.imageUrls,
        questionType: dto.questionType,
        dimension: dto.dimension,
        sortOrder: dto.sortOrder,
        isActive: dto.isActive,
      },
    });
  }

  async deleteQuestion(questionId: string) {
    const existing = await this.prisma.quizQuestion.findUnique({
      where: { id: questionId },
    });

    if (!existing) {
      throw new NotFoundException("题目不存在");
    }

    await this.prisma.quizQuestion.delete({ where: { id: questionId } });
    return { success: true };
  }

  // ==================== 答案提交 ====================

  async submitAnswer(userId: string, dto: SubmitQuizAnswerDto) {
    const question = await this.prisma.quizQuestion.findUnique({
      where: { id: dto.questionId },
    });

    if (!question) {
      throw new NotFoundException("题目不存在");
    }

    // 根据题目类型校验答案字段
    this.validateAnswerForQuestionType(question.questionType, dto);

    return this.prisma.quizAnswer.create({
      data: {
        userId,
        questionId: dto.questionId,
        selectedImageIndex: dto.selectedImageIndex,
        selectedOption: dto.selectedOption,
        sliderValue: dto.sliderValue,
        responseTimeMs: dto.responseTimeMs,
      },
    });
  }

  async batchSubmitAnswers(userId: string, dto: BatchSubmitAnswersDto) {
    const quiz = await this.prisma.styleQuiz.findUnique({
      where: { id: dto.quizId },
      include: { questions: { where: { isActive: true } } },
    });

    if (!quiz) {
      throw new NotFoundException("问卷不存在");
    }

    const questionIds = new Set(quiz.questions.map((q) => q.id));

    // 校验所有答案对应的题目都属于该问卷
    for (const answer of dto.answers) {
      if (!questionIds.has(answer.questionId)) {
        throw new BadRequestException(
          `题目 ${answer.questionId} 不属于该问卷`,
        );
      }
    }

    // 批量创建答案
    const created = await this.prisma.quizAnswer.createMany({
      data: dto.answers.map((answer) => ({
        userId,
        questionId: answer.questionId,
        selectedImageIndex: answer.selectedImageIndex,
        selectedOption: answer.selectedOption,
        sliderValue: answer.sliderValue,
        responseTimeMs: answer.responseTimeMs,
      })),
      skipDuplicates: true,
    });

    this.logger.log(`User ${userId} submitted ${created.count} answers for quiz ${dto.quizId}`);

    // Run color derivation from quiz choices
    try {
      const selectedOptions = dto.answers
        .filter((a) => a.selectedOption)
        .map((a) => a.selectedOption as string);

      if (selectedOptions.length > 0) {
        // Map selected option strings into the shape expected by ColorDerivationEngine
        const colorInput = selectedOptions.map((option) => ({
          colorTags: [{ hex: option, category: "derived", weight: 1.0 }],
        }));
        const colorResult = this.colorDerivation.deriveColorPreferences(colorInput);
        if (colorResult.colorPalette.length > 0) {
          this.logger.log(`Derived ${colorResult.colorPalette.length} colors for user ${userId} from quiz ${dto.quizId}`);

          // Write derived color palette to UserProfile
          const colorHexes = colorResult.colorPalette.map((c) => c.hex);
          await this.prisma.userProfile.upsert({
            where: { userId },
            create: {
              userId,
              colorPreferences: colorHexes,
            },
            update: {
              colorPreferences: colorHexes,
            },
          });
        }
      }
    } catch (error) {
      this.logger.warn(`Color derivation failed for user ${userId}: ${error instanceof Error ? error.message : String(error)}`);
    }

    return { count: created.count };
  }

  // ==================== 测试结果 ====================

  async getQuizResults(userId: string, query: QuizResultQueryDto): Promise<PaginatedResponse<Prisma.StyleQuizResultGetPayload<{ include: { quiz: { select: { id: true; title: true } } } }>>> {
    const { page = 1, pageSize = 20 } = normalizePaginationParams(query);

    const where: Prisma.StyleQuizResultWhereInput = { userId };

    if (query.quizId) {
      where.quizId = query.quizId;
    }
    if (query.isLatest !== undefined) {
      where.isLatest = query.isLatest;
    }

    const [items, total] = await Promise.all([
      this.prisma.styleQuizResult.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          quiz: { select: { id: true, title: true } },
        },
      }),
      this.prisma.styleQuizResult.count({ where }),
    ]);

    return createPaginatedResponse(items, total, page, pageSize);
  }

  async getLatestResult(userId: string) {
    const result = await this.prisma.styleQuizResult.findFirst({
      where: { userId, isLatest: true },
      include: {
        quiz: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!result) {
      throw new NotFoundException("暂无测试结果");
    }

    return result;
  }

  /**
   * 保存测试结果，并将之前的结果标记为非最新
   */
  async saveQuizResult(
    userId: string,
    quizId: string,
    data: {
      occasionPreferences: Record<string, number>;
      colorPreferences: Record<string, number>;
      styleKeywords: string[];
      priceRange: string;
      confidenceScore: number;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      // 将之前的结果标记为非最新
      await tx.styleQuizResult.updateMany({
        where: { userId, isLatest: true },
        data: { isLatest: false },
      });

      // 创建新结果
      const result = await tx.styleQuizResult.create({
        data: {
          userId,
          quizId,
          occasionPreferences: data.occasionPreferences,
          colorPreferences: data.colorPreferences,
          styleKeywords: data.styleKeywords,
          priceRange: data.priceRange as PriceRange,
          confidenceScore: data.confidenceScore,
          isLatest: true,
        },
        include: {
          quiz: { select: { id: true, title: true } },
        },
      });

      this.logger.log(`User ${userId} saved quiz result for quiz ${quizId}, confidence: ${data.confidenceScore}`);

      // 推进 onboarding 步骤：风格测试完成后从 STYLE_TEST 推进到 COMPLETED
      if (this.onboardingService) {
        try {
          await this.onboardingService.skipStep(userId, "STYLE_TEST");
        } catch {
          // 用户可能不在 STYLE_TEST 步骤，忽略错误
        }
      }

      // Emit quiz:completed event (fire-and-forget)
      this.eventEmitter.emitQuizResultSaved(userId, quizId).catch(() => {
        // Event emission failure should not block result saving
      });

      return result;
    });
  }

  // ==================== 私有方法 ====================

  private validateAnswerForQuestionType(
    questionType: string,
    dto: SubmitQuizAnswerDto,
  ) {
    switch (questionType) {
      case "visual_choice":
        if (dto.selectedImageIndex === undefined && dto.selectedImageIndex === null) {
          throw new BadRequestException("视觉选择题必须选择图片索引");
        }
        break;
      case "text_choice":
        if (!dto.selectedOption) {
          throw new BadRequestException("文本选择题必须选择选项");
        }
        break;
      case "slider":
        if (dto.sliderValue === undefined && dto.sliderValue === null) {
          throw new BadRequestException("滑块题必须提供滑块值");
        }
        break;
    }
  }

  // ==================== 用户端测试流程 ====================

  async getQuizQuestions(userId: string, quizId: string): Promise<QuizQuestionWithMeta[]> {
    return this.questionSelector.selectQuestions(userId, quizId);
  }

  async saveAnswer(userId: string, questionId: string, selectedImageIndex: number, duration?: number) {
    const question = await this.prisma.quizQuestion.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      throw new NotFoundException("题目不存在");
    }

    const existing = await this.prisma.quizAnswer.findFirst({
      where: { userId, questionId },
    });

    if (existing) {
      return this.prisma.quizAnswer.update({
        where: { id: existing.id },
        data: {
          selectedImageIndex,
          responseTimeMs: duration ?? null,
        },
      });
    }

    return this.prisma.quizAnswer.create({
      data: {
        userId,
        questionId,
        selectedImageIndex,
        responseTimeMs: duration ?? null,
      },
    });
  }

  async calculateResult(userId: string, quizId: string) {
    const quiz = await this.prisma.styleQuiz.findUnique({
      where: { id: quizId },
      include: { questions: { where: { isActive: true } } },
    });

    if (!quiz) {
      throw new NotFoundException("问卷不存在");
    }

    const questionIds = quiz.questions.map((q) => q.id);

    const answers = await this.prisma.quizAnswer.findMany({
      where: { userId, questionId: { in: questionIds } },
    });

    if (answers.length === 0) {
      throw new BadRequestException("尚未作答，无法计算结果");
    }

    const selectedImages: SelectedImageWithMeta[] = [];

    for (const answer of answers) {
      const question = quiz.questions.find((q) => q.id === answer.questionId);
      if (!question || answer.selectedImageIndex === null || answer.selectedImageIndex === undefined) {continue;}

      const imageMetas = QUESTION_IMAGE_META_MAP?.[question.id];
      if (!imageMetas) {continue;}

      const imageMeta = imageMetas.find((m) => m.index === answer.selectedImageIndex);
      if (!imageMeta) {continue;}

      selectedImages.push({
        questionId: answer.questionId,
        selectedImageIndex: answer.selectedImageIndex,
        duration: answer.responseTimeMs ?? 3000,
        imageMeta,
      });
    }

    let colorResult: { hueDistribution: Record<string, number> };
    let styleResult: { styleKeywords: string[]; occasionPreferences: Record<string, number>; priceRangePreference: string; confidenceScore: number };

    if (selectedImages.length > 0) {
      colorResult = this.colorDeriver.deriveColorPreferences(selectedImages);
      styleResult = this.styleKeywordExtractor.extractStyleKeywords(selectedImages);
    } else {
      const occasionPreferences: Record<string, number> = {};
      const styleKeywordsSet = new Set<string>();
      const priceScores: Record<string, number> = {};

      for (const answer of answers) {
        const question = quiz.questions.find((q) => q.id === answer.questionId);
        if (!question) {continue;}

        const dim = question.dimension;

        if (dim === "occasion" && answer.selectedOption) {
          occasionPreferences[answer.selectedOption] = (occasionPreferences[answer.selectedOption] ?? 0) + 1;
        }

        if (dim === "style" && answer.selectedOption) {
          styleKeywordsSet.add(answer.selectedOption);
        }

        if (dim === "price" && answer.selectedOption) {
          priceScores[answer.selectedOption] = (priceScores[answer.selectedOption] ?? 0) + 1;
        }
      }

      let priceRange = "mid_range";
      const priceEntries = Object.entries(priceScores);
      if (priceEntries.length > 0) {
        priceEntries.sort((a, b) => b[1] - a[1]);
        priceRange = priceEntries[0]![0];
      }

      const totalQuestions = quiz.questions.length;
      const answeredQuestions = answers.length;

      colorResult = { hueDistribution: {} };
      styleResult = {
        styleKeywords: [...styleKeywordsSet],
        occasionPreferences,
        priceRangePreference: priceRange,
        confidenceScore: Math.min(1, answeredQuestions / totalQuestions),
      };
    }

    const colorPreferences: Record<string, number> = {};
    for (const [segment, weight] of Object.entries(colorResult.hueDistribution)) {
      colorPreferences[segment] = weight;
    }

    const confidenceScore = styleResult.confidenceScore;

    return this.saveQuizResult(userId, quizId, {
      occasionPreferences: styleResult.occasionPreferences,
      colorPreferences,
      styleKeywords: styleResult.styleKeywords,
      priceRange: styleResult.priceRangePreference,
      confidenceScore,
    });
  }

  async getQuizProgress(userId: string, quizId: string) {
    const quiz = await this.prisma.styleQuiz.findUnique({
      where: { id: quizId },
      include: { questions: { where: { isActive: true } } },
    });

    if (!quiz) {
      throw new NotFoundException("问卷不存在");
    }

    const questionIds = quiz.questions.map((q) => q.id);

    const answeredCount = await this.prisma.quizAnswer.count({
      where: { userId, questionId: { in: questionIds } },
    });

    const totalQuestions = quiz.questions.length;

    const answeredQuestions = await this.prisma.quizAnswer.findMany({
      where: { userId, questionId: { in: questionIds } },
      select: { questionId: true, selectedImageIndex: true, selectedOption: true },
    });

    return {
      quizId,
      totalQuestions,
      answeredCount,
      progress: totalQuestions > 0 ? answeredCount / totalQuestions : 0,
      isCompleted: answeredCount >= totalQuestions,
      answers: answeredQuestions,
    };
  }
}
