import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";

import { AuthGuard } from "../auth/guards/auth.guard";
import { RequestWithUser } from "../../common/types/common.types";

import { ConsultantService } from "./consultant.service";
import { ConsultantMatchingService } from "./consultant-matching.service";
import { ConsultantAvailabilityService } from "./consultant-availability.service";
import {
  CreateConsultantProfileDto,
  UpdateConsultantProfileDto,
  ConsultantQueryDto,
  CreateServiceBookingDto,
  UpdateServiceBookingDto,
  BookingQueryDto,
  ConsultantMatchRequestDto,
  BatchCreateAvailabilityDto,
  AvailableSlotsQueryDto,
} from "./dto";

@ApiTags("consultant")
@Controller("consultant")
export class ConsultantController {
  constructor(
    private readonly consultantService: ConsultantService,
    private readonly consultantMatchingService: ConsultantMatchingService,
    private readonly availabilityService: ConsultantAvailabilityService,
  ) {}

  // ==================== 顾问档案 ====================

  @Post("profiles")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "创建顾问档案", description: "创建造型顾问档案" })
  @ApiResponse({ status: 201, description: "创建成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  async createProfile(
    @Request() req: RequestWithUser,
    @Body() dto: CreateConsultantProfileDto,
  ) {
    return this.consultantService.createProfile(req.user.id, dto);
  }

  @Get("profiles")
  @ApiOperation({ summary: "获取顾问列表", description: "分页获取造型顾问列表，公开接口" })
  @ApiResponse({ status: 200, description: "成功返回顾问列表" })
  async getProfiles(@Query() query: ConsultantQueryDto) {
    return this.consultantService.getProfiles(query);
  }

  @Get("profiles/me")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "获取当前用户顾问档案", description: "获取当前登录用户的顾问档案" })
  @ApiResponse({ status: 200, description: "成功返回顾问档案" })
  @ApiResponse({ status: 401, description: "未授权" })
  async getMyProfile(@Request() req: RequestWithUser) {
    return this.consultantService.getProfileByUserId(req.user.id);
  }

  @Get("profiles/:id")
  @ApiOperation({ summary: "获取顾问详情", description: "根据ID获取顾问档案详情，公开接口" })
  @ApiResponse({ status: 200, description: "成功返回顾问详情" })
  @ApiResponse({ status: 404, description: "顾问不存在" })
  @ApiParam({ name: "id", description: "顾问档案ID" })
  async getProfileById(@Param("id") id: string) {
    return this.consultantService.getProfileById(id);
  }

  @Put("profiles/:id")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "更新顾问档案", description: "更新指定顾问档案信息" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "顾问档案不存在" })
  @ApiParam({ name: "id", description: "顾问档案ID" })
  async updateProfile(
    @Request() req: RequestWithUser,
    @Param("id") id: string,
    @Body() dto: UpdateConsultantProfileDto,
  ) {
    return this.consultantService.updateProfile(req.user.id, id, dto);
  }

  // ==================== 智能匹配 ====================

  @Post("match")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "智能匹配顾问", description: "根据用户需求智能匹配最合适的造型顾问" })
  @ApiResponse({ status: 200, description: "返回匹配的顾问列表" })
  @ApiResponse({ status: 401, description: "未授权" })
  async matchConsultants(
    @Request() req: RequestWithUser,
    @Body() dto: ConsultantMatchRequestDto,
  ) {
    return this.consultantMatchingService.findMatches(req.user.id, dto);
  }

  // ==================== 顾问排期 ====================

  @Get("availability")
  @ApiOperation({ summary: "获取顾问排期", description: "获取顾问每周可用时段模板" })
  @ApiResponse({ status: 200, description: "成功返回排期模板" })
  async getAvailability(@Query("consultantId") consultantId: string) {
    return this.availabilityService.getAvailability(consultantId);
  }

  @Get("available-slots")
  @ApiOperation({ summary: "获取可用时段", description: "获取指定日期的可用时段列表" })
  @ApiResponse({ status: 200, description: "成功返回可用时段" })
  async getAvailableSlots(@Query() query: AvailableSlotsQueryDto) {
    return this.availabilityService.getAvailableSlots(query);
  }

  @Post("availability")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "设置排期模板", description: "顾问设置每周可用时段模板" })
  @ApiResponse({ status: 201, description: "设置成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  async setAvailability(
    @Request() req: RequestWithUser,
    @Body() dto: BatchCreateAvailabilityDto,
    @Query("consultantId") consultantId: string,
  ) {
    return this.availabilityService.setAvailability(
      consultantId,
      req.user.id,
      dto,
    );
  }

  // ==================== 服务预约 ====================

  @Post("bookings")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "创建服务预约", description: "预约造型顾问服务" })
  @ApiResponse({ status: 201, description: "预约成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  async createBooking(
    @Request() req: RequestWithUser,
    @Body() dto: CreateServiceBookingDto,
  ) {
    return this.consultantService.createBooking(req.user.id, dto);
  }

  @Get("bookings")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "获取我的预约列表", description: "分页获取当前用户的服务预约列表" })
  @ApiResponse({ status: 200, description: "成功返回预约列表" })
  @ApiResponse({ status: 401, description: "未授权" })
  async getMyBookings(
    @Request() req: RequestWithUser,
    @Query() query: BookingQueryDto,
  ) {
    return this.consultantService.getBookingsByUser(req.user.id, query);
  }

  @Get("bookings/:id")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "获取预约详情", description: "获取指定服务预约的详细信息" })
  @ApiResponse({ status: 200, description: "成功返回预约详情" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "预约不存在" })
  @ApiParam({ name: "id", description: "预约ID" })
  async getBookingById(
    @Request() req: RequestWithUser,
    @Param("id") id: string,
  ) {
    return this.consultantService.getBookingById(req.user.id, id);
  }

  @Put("bookings/:id")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "更新预约", description: "更新服务预约状态或信息" })
  @ApiResponse({ status: 200, description: "更新成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "预约不存在" })
  @ApiParam({ name: "id", description: "预约ID" })
  async updateBooking(
    @Request() req: RequestWithUser,
    @Param("id") id: string,
    @Body() dto: UpdateServiceBookingDto,
  ) {
    return this.consultantService.updateBooking(req.user.id, id, dto);
  }

  @Get("consultants/:consultantId/bookings")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "获取顾问的预约列表", description: "顾问查看自己的服务预约列表" })
  @ApiResponse({ status: 200, description: "成功返回预约列表" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiParam({ name: "consultantId", description: "顾问ID" })
  async getConsultantBookings(
    @Request() req: RequestWithUser,
    @Param("consultantId") consultantId: string,
    @Query() query: BookingQueryDto,
  ) {
    return this.consultantService.getBookingsByConsultant(
      req.user.id,
      consultantId,
      query,
    );
  }

  // ==================== 分阶段付款 ====================

  @Post("bookings/:id/pay-deposit")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "支付定金", description: "为预约支付30%定金，支付后预约状态变为confirmed" })
  @ApiResponse({ status: 200, description: "返回支付信息" })
  @ApiResponse({ status: 400, description: "预约状态不允许支付" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiParam({ name: "id", description: "预约ID" })
  async payDeposit(
    @Request() req: RequestWithUser,
    @Param("id") id: string,
  ) {
    return this.consultantService.payDeposit(req.user.id, id);
  }

  @Post("bookings/:id/pay-final")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "支付尾款", description: "服务完成后支付70%尾款" })
  @ApiResponse({ status: 200, description: "返回支付信息" })
  @ApiResponse({ status: 400, description: "服务未完成或定金未支付" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiParam({ name: "id", description: "预约ID" })
  async payFinalPayment(
    @Request() req: RequestWithUser,
    @Param("id") id: string,
  ) {
    return this.consultantService.payFinalPayment(req.user.id, id);
  }
}
