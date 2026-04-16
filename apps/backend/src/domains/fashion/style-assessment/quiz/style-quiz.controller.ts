import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from "@nestjs/swagger";

import { RequestWithUser } from "../../../../common/types/common.types";
import { JwtAuthGuard } from "../../../../modules/auth/guards/jwt-auth.guard";

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
  GetQuizQuestionsDto,
  SaveAnswerDto,
  CompleteQuizDto,
  QuizProgressDto,
} from "./dto/style-quiz.dto";
import { QuestionSelectorService } from "./services/question-selector";
import { QuizProgressService } from "./services/quiz-progress.service";
import { StyleQuizService } from "./style-quiz.service";

@ApiTags("quiz")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("quiz")
export class StyleQuizController {
  constructor(
    private readonly styleQuizService: StyleQuizService,
    private readonly questionSelector: QuestionSelectorService,
    private readonly quizProgressService: QuizProgressService,
  ) {}

  // ==================== 问卷 CRUD ====================

  @Post("quizzes")
  @ApiOperation({ summary: "创建风格测试问卷" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  async createQuiz(@Body() dto: CreateStyleQuizDto) {
    return this.styleQuizService.createQuiz(dto);
  }

  @Get("quizzes")
  @ApiOperation({ summary: "获取问卷列表" })
  @ApiResponse({ status: 200, description: "成功返回问卷列表" })
  @ApiResponse({ status: 401, description: "未授权" })
  async getQuizzes(@Query() query: StyleQuizQueryDto) {
    return this.styleQuizService.getQuizzes(query);
  }

  @Get("quizzes/:quizId")
  @ApiOperation({ summary: "获取问卷详情（含题目）" })
  @ApiResponse({ status: 200, description: "成功返回问卷详情" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "问卷不存在" })
  @ApiParam({ name: "quizId", description: "问卷ID" })
  async getQuizById(@Param("quizId") quizId: string) {
    return this.styleQuizService.getQuizById(quizId);
  }

  @Put("quizzes/:quizId")
  @ApiOperation({ summary: "更新问卷" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "问卷不存在" })
  @ApiParam({ name: "quizId", description: "问卷ID" })
  async updateQuiz(
    @Param("quizId") quizId: string,
    @Body() dto: UpdateStyleQuizDto,
  ) {
    return this.styleQuizService.updateQuiz(quizId, dto);
  }

  @Delete("quizzes/:quizId")
  @ApiOperation({ summary: "删除问卷" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "问卷不存在" })
  @ApiParam({ name: "quizId", description: "问卷ID" })
  async deleteQuiz(@Param("quizId") quizId: string) {
    return this.styleQuizService.deleteQuiz(quizId);
  }

  // ==================== 题目 CRUD ====================

  @Post("questions")
  @ApiOperation({ summary: "创建问卷题目" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  async createQuestion(@Body() dto: CreateQuizQuestionDto) {
    return this.styleQuizService.createQuestion(dto);
  }

  @Get("quizzes/:quizId/questions")
  @ApiOperation({ summary: "获取问卷题目列表" })
  @ApiResponse({ status: 200, description: "成功返回题目列表" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiParam({ name: "quizId", description: "问卷ID" })
  async getQuestions(
    @Param("quizId") quizId: string,
    @Query() query: QuizQuestionQueryDto,
  ) {
    return this.styleQuizService.getQuestions(quizId, query);
  }

  @Put("questions/:questionId")
  @ApiOperation({ summary: "更新题目" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "题目不存在" })
  @ApiParam({ name: "questionId", description: "题目ID" })
  async updateQuestion(
    @Param("questionId") questionId: string,
    @Body() dto: UpdateQuizQuestionDto,
  ) {
    return this.styleQuizService.updateQuestion(questionId, dto);
  }

  @Delete("questions/:questionId")
  @ApiOperation({ summary: "删除题目" })
  @ApiResponse({ status: 200, description: "删除成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "题目不存在" })
  @ApiParam({ name: "questionId", description: "题目ID" })
  async deleteQuestion(@Param("questionId") questionId: string) {
    return this.styleQuizService.deleteQuestion(questionId);
  }

  // ==================== 答案提交 ====================

  @Post("answers")
  @ApiOperation({ summary: "提交单个答案" })
  @ApiResponse({ status: 200, description: "提交成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  async submitAnswer(
    @Request() req: RequestWithUser,
    @Body() dto: SubmitQuizAnswerDto,
  ) {
    return this.styleQuizService.submitAnswer(req.user.id, dto);
  }

  @Post("answers/batch")
  @ApiOperation({ summary: "批量提交答案" })
  @ApiResponse({ status: 200, description: "提交成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  async batchSubmitAnswers(
    @Request() req: RequestWithUser,
    @Body() dto: BatchSubmitAnswersDto,
  ) {
    return this.styleQuizService.batchSubmitAnswers(req.user.id, dto);
  }

  // ==================== 测试结果 ====================

  @Get("results")
  @ApiOperation({ summary: "获取测试结果列表" })
  @ApiResponse({ status: 200, description: "成功返回测试结果列表" })
  @ApiResponse({ status: 401, description: "未授权" })
  async getQuizResults(
    @Request() req: RequestWithUser,
    @Query() query: QuizResultQueryDto,
  ) {
    return this.styleQuizService.getQuizResults(req.user.id, query);
  }

  @Get("results/latest")
  @ApiOperation({ summary: "获取最新测试结果" })
  @ApiResponse({ status: 200, description: "成功返回最新测试结果" })
  @ApiResponse({ status: 401, description: "未授权" })
  async getLatestResult(@Request() req: RequestWithUser) {
    return this.styleQuizService.getLatestResult(req.user.id);
  }

  @Post("submit")
  @ApiOperation({ summary: "提交测试答案（兼容路由，等同 answers/batch）" })
  @ApiResponse({ status: 200, description: "提交成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  async submitQuiz(
    @Request() req: RequestWithUser,
    @Body() dto: BatchSubmitAnswersDto,
  ) {
    return this.styleQuizService.batchSubmitAnswers(req.user.id, dto);
  }

  @Get("result")
  @ApiOperation({ summary: "获取最新测试结果（兼容路由，等同 results/latest）" })
  @ApiResponse({ status: 200, description: "成功返回最新测试结果" })
  @ApiResponse({ status: 401, description: "未授权" })
  async getResult(@Request() req: RequestWithUser) {
    return this.styleQuizService.getLatestResult(req.user.id);
  }

  // ==================== 用户端测试流程 ====================

  @Get("questions")
  @ApiOperation({ summary: "获取问卷题目（智能选题）" })
  @ApiResponse({ status: 200, description: "成功返回题目列表" })
  @ApiResponse({ status: 401, description: "未授权" })
  async getQuizQuestions(
    @Request() req: RequestWithUser,
    @Query() query: GetQuizQuestionsDto,
  ) {
    return this.styleQuizService.getQuizQuestions(req.user.id, query.quizId);
  }

  @Post("answer")
  @ApiOperation({ summary: "提交单题答案（自动保存）" })
  @ApiResponse({ status: 200, description: "保存成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  async saveAnswer(
    @Request() req: RequestWithUser,
    @Body() dto: SaveAnswerDto,
  ) {
    return this.styleQuizService.saveAnswer(
      req.user.id,
      dto.questionId,
      dto.selectedImageIndex,
      dto.duration,
    );
  }

  @Post("complete")
  @ApiOperation({ summary: "完成测试，计算结果" })
  @ApiResponse({ status: 200, description: "计算成功，返回测试结果" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  async completeQuiz(
    @Request() req: RequestWithUser,
    @Body() dto: CompleteQuizDto,
  ) {
    return this.styleQuizService.calculateResult(req.user.id, dto.quizId);
  }

  @Get("progress")
  @ApiOperation({ summary: "获取测试进度" })
  @ApiResponse({ status: 200, description: "成功返回测试进度" })
  @ApiResponse({ status: 401, description: "未授权" })
  async getQuizProgress(
    @Request() req: RequestWithUser,
    @Query() query: QuizProgressDto,
  ) {
    return this.styleQuizService.getQuizProgress(req.user.id, query.quizId);
  }

  // ========== Plan 03: Quiz session progress endpoints (Redis-backed) ==========

  @Get("quizzes/:quizId/progress")
  @ApiOperation({ summary: "获取问卷会话进度 (Redis)" })
  @ApiResponse({ status: 200, description: "成功返回会话进度" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiParam({ name: "quizId", description: "问卷ID" })
  async getQuizSessionProgress(
    @Request() req: RequestWithUser,
    @Param("quizId") quizId: string,
  ) {
    const progress = await this.quizProgressService.getProgress(req.user.id, quizId);
    return { data: progress };
  }

  @Post("quizzes/:quizId/progress")
  @ApiOperation({ summary: "保存问卷会话进度 (Redis)" })
  @ApiResponse({ status: 200, description: "保存成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiParam({ name: "quizId", description: "问卷ID" })
  async saveQuizSessionProgress(
    @Request() req: RequestWithUser,
    @Param("quizId") quizId: string,
    @Body() body: { questionIndex: number; answers: Record<string, string> },
  ) {
    await this.quizProgressService.saveProgress(
      req.user.id,
      quizId,
      body.questionIndex,
      body.answers,
    );
    return { data: { saved: true } };
  }
}
