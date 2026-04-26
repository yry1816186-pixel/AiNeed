import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";

import { AuthenticatedRequest } from "../../../common/types/auth.types";
import {
  EditDayPlanDto,
  GenerateWeeklyPlanDto,
  WeeklyPlanResponseDto,
  RepeatCheckResponseDto,
} from "./dto/calendar-plan.dto";
import { CalendarPlanService } from "./services/calendar-plan.service";

/**
 * 日历穿搭计划控制器 — CAL-03, CAL-04, CAL-05
 *
 * 路由前缀: /api/v1/calendar
 * - GET    /weekly-plan       获取本周穿搭计划
 * - POST   /weekly-plan       AI 自动生成本周穿搭计划
 * - PATCH  /plan/:date        编辑某天穿搭方案
 * - GET    /plan/:date/repeat-check  重复穿搭检测
 */
@ApiTags("calendar")
@ApiBearerAuth()
@Controller("calendar")
export class CalendarPlanController {
  constructor(private readonly calendarPlanService: CalendarPlanService) {}

  @Get("weekly-plan")
  @ApiOperation({
    summary: "获取本周穿搭计划",
    description: "获取当前用户本周的穿搭计划列表，包含每天的计划、穿搭详情和天气上下文。",
  })
  @ApiQuery({ name: "latitude", required: false, type: Number, description: "用户纬度" })
  @ApiQuery({ name: "longitude", required: false, type: Number, description: "用户经度" })
  @ApiResponse({ status: 200, description: "获取成功", type: WeeklyPlanResponseDto })
  @ApiResponse({ status: 401, description: "未授权" })
  async getWeeklyPlan(
    @Request() req: AuthenticatedRequest,
    @Query("latitude") latitude?: string,
    @Query("longitude") longitude?: string
  ) {
    const lat = latitude ? parseFloat(latitude) : undefined;
    const lon = longitude ? parseFloat(longitude) : undefined;

    // Check if we have existing plans first
    const existing = await this.calendarPlanService.getWeeklyPlan(req.user.id);

    // If no plans exist yet, auto-generate
    if (existing.plans.length === 0) {
      return this.calendarPlanService.generateWeeklyPlan(req.user.id, lat, lon);
    }

    return existing;
  }

  @Post("weekly-plan")
  @ApiOperation({
    summary: "AI 自动生成本周穿搭计划",
    description:
      "基于用户衣柜、天气数据和即将到来的事件，AI 自动生成未来 7 天的穿搭计划。每天选择最优穿搭，考虑季节、温度、场景、多样性和穿着频率。",
  })
  @ApiResponse({ status: 201, description: "生成成功", type: WeeklyPlanResponseDto })
  @ApiResponse({ status: 401, description: "未授权" })
  async generateWeeklyPlan(
    @Request() req: AuthenticatedRequest,
    @Body() dto: GenerateWeeklyPlanDto
  ) {
    return this.calendarPlanService.generateWeeklyPlan(req.user.id, dto.latitude, dto.longitude);
  }

  @Patch("plan/:date")
  @ApiOperation({
    summary: "编辑某天的穿搭计划",
    description: "手动替换某天的穿搭方案。编辑后系统会发射偏好信号，用于推荐系统学习用户偏好。",
  })
  @ApiParam({
    name: "date",
    description: "日期，格式 YYYY-MM-DD",
    type: String,
    example: "2026-04-20",
  })
  @ApiResponse({ status: 200, description: "编辑成功" })
  @ApiResponse({ status: 400, description: "日期格式无效" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "穿搭方案不存在" })
  async editDayPlan(
    @Request() req: AuthenticatedRequest,
    @Param("date") date: string,
    @Body() dto: EditDayPlanDto
  ) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      throw new NotFoundException("日期格式必须为 YYYY-MM-DD");
    }

    return this.calendarPlanService.editDayPlan(req.user.id, date, dto.outfitId);
  }

  @Get("plan/:date/repeat-check")
  @ApiOperation({
    summary: "重复穿搭检测",
    description:
      "检测指定日期的穿搭计划是否与近期（前后 3 天）的穿搭重复，基于服装项重叠度 >70% 判定。",
  })
  @ApiParam({
    name: "date",
    description: "日期，格式 YYYY-MM-DD",
    type: String,
    example: "2026-04-20",
  })
  @ApiResponse({ status: 200, description: "检测成功", type: RepeatCheckResponseDto })
  @ApiResponse({ status: 401, description: "未授权" })
  async checkRepeatOutfit(@Request() req: AuthenticatedRequest, @Param("date") date: string) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      throw new NotFoundException("日期格式必须为 YYYY-MM-DD");
    }

    return this.calendarPlanService.checkRepeatOutfit(req.user.id, date);
  }
}
