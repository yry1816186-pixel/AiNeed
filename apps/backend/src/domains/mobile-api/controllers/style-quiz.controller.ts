import { Controller, Get, Post, Body, Request, UseGuards, Inject } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiBody } from "@nestjs/swagger";

import { AuthenticatedRequest } from "../../../common/types/auth.types";
import { JwtAuthGuard } from "../../identity/auth/guards/jwt-auth.guard";
import { StyleQuizService } from "../../fashion/style-assessment/quiz/style-quiz.service";
import { BatchSubmitAnswersDto } from "../../fashion/style-assessment/quiz/dto/style-quiz.dto";
import { PrismaService } from "../../../common/prisma/prisma.service";

@ApiTags("StyleQuiz (Mobile)")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("style-quiz")
export class MobileStyleQuizController {
  constructor(
    private readonly styleQuizService: StyleQuizService,
    @Inject(PrismaService) private readonly prisma: PrismaService
  ) {}

  @Get()
  @ApiOperation({ summary: "获取风格测试题目" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  async getQuestions(@Request() req: AuthenticatedRequest) {
    let quizId = "";
    const firstQuiz = await this.prisma.styleQuiz.findFirst({ orderBy: { createdAt: "desc" } });
    if (firstQuiz) {
      quizId = firstQuiz.id;
    }
    const data = await this.styleQuizService.getQuizQuestions(req.user.id, quizId);
    return { success: true, data };
  }

  @Post("submit")
  @ApiOperation({ summary: "提交风格测试答案" })
  @ApiBody({ type: BatchSubmitAnswersDto })
  @ApiResponse({ status: 200, description: "提交成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  async submitAnswers(@Request() req: AuthenticatedRequest, @Body() dto: BatchSubmitAnswersDto) {
    const data = await this.styleQuizService.batchSubmitAnswers(req.user.id, dto);
    return { success: true, data };
  }
}
