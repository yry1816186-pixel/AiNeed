import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from "@nestjs/swagger";

import { CurrentUser } from "../../../identity/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../../../identity/auth/guards/jwt-auth.guard";

import { DiaryQueryDto, WeeklyReportQueryDto } from "../dto";
import { OutfitDiaryService } from "../services/outfit-diary.service";
import { WeeklyReportService } from "../services/weekly-report.service";

@ApiTags("diary")
@Controller("diary")
export class DiaryController {
  constructor(
    private readonly diaryService: OutfitDiaryService,
    private readonly weeklyReportService: WeeklyReportService
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: "获取穿搭日记列表",
    description: "查询用户的穿搭日记记录，支持按日期范围筛选。日记通过行为事件自动生成。",
  })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  async getDiaryEntries(@CurrentUser("id") userId: string, @Query() query: DiaryQueryDto) {
    return this.diaryService.getDiaryEntries(userId, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get("weekly-report")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "获取最新周报",
    description:
      "获取用户最新的穿搭周报，包含满意度、风格分布、趋势摘要、进化曲线、场景覆盖、色彩分析和单品复用率共7个维度的分析。",
  })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  async getLatestWeeklyReport(@CurrentUser("id") userId: string) {
    const report = await this.weeklyReportService.getLatestReport(userId);

    if (!report) {
      return {
        hasReport: false,
        message: "暂无周报数据，系统将在每周日晚8点自动生成",
      };
    }

    return {
      hasReport: true,
      report,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get("weekly-report/history")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "获取周报历史",
    description: "获取用户的历史周报列表，默认返回最近4周。",
  })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  async getWeeklyReportHistory(
    @CurrentUser("id") userId: string,
    @Query() query: WeeklyReportQueryDto
  ) {
    return this.weeklyReportService.getReportHistory(userId, query);
  }
}
