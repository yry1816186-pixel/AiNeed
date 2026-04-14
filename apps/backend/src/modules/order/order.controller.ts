import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from "@nestjs/swagger";

import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

import { OrderService, CreateOrderDto } from "./order.service";

@ApiTags("orders")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("orders")
export class OrderController {
  constructor(private orderService: OrderService) {}

  @Get()
  @ApiOperation({ summary: "获取订单列表" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiQuery({ name: "status", required: false, description: "订单状态筛选" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "页码" })
  @ApiQuery({ name: "limit", required: false, type: Number, description: "每页数量" })
  async findAll(
    @Request() req: { user: { id: string } },
    @Query("status") status?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.orderService.findAll(req.user.id, {
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    });
  }

  @Get(":id")
  @ApiOperation({ summary: "获取订单详情" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "订单不存在" })
  @ApiParam({ name: "id", description: "订单 ID" })
  async findOne(
    @Request() req: { user: { id: string } },
    @Param("id") id: string,
  ) {
    return this.orderService.findOne(req.user.id, id);
  }

  @Post()
  @ApiOperation({ summary: "创建订单" })
  @ApiResponse({ status: 201, description: "订单创建成功" })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  async create(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateOrderDto,
  ) {
    return this.orderService.create(req.user.id, dto);
  }

  @Post(":id/pay")
  @ApiOperation({ summary: "支付订单" })
  @ApiResponse({ status: 200, description: "支付发起成功" })
  @ApiResponse({ status: 400, description: "订单状态不允许支付" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "订单不存在" })
  @ApiParam({ name: "id", description: "订单 ID" })
  async pay(
    @Request() req: { user: { id: string } },
    @Param("id") id: string,
    @Body() body: { paymentMethod: string },
  ) {
    return this.orderService.pay(req.user.id, id, body.paymentMethod);
  }

  @Post(":id/cancel")
  @ApiOperation({ summary: "取消订单" })
  @ApiResponse({ status: 200, description: "订单取消成功" })
  @ApiResponse({ status: 400, description: "订单状态不允许取消" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "订单不存在" })
  @ApiParam({ name: "id", description: "订单 ID" })
  async cancel(
    @Request() req: { user: { id: string } },
    @Param("id") id: string,
  ) {
    await this.orderService.cancel(req.user.id, id);
    return { success: true };
  }

  @Post(":id/confirm")
  @ApiOperation({ summary: "确认收货" })
  @ApiResponse({ status: 200, description: "确认收货成功" })
  @ApiResponse({ status: 400, description: "订单状态不允许确认收货" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "订单不存在" })
  @ApiParam({ name: "id", description: "订单 ID" })
  async confirm(
    @Request() req: { user: { id: string } },
    @Param("id") id: string,
  ) {
    await this.orderService.confirm(req.user.id, id);
    return { success: true };
  }

  @Get(":id/tracking")
  @ApiOperation({ summary: "获取物流信息" })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 400, description: "暂无物流信息" })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 404, description: "订单不存在" })
  @ApiParam({ name: "id", description: "订单 ID" })
  async getTracking(
    @Request() req: { user: { id: string } },
    @Param("id") id: string,
  ) {
    return this.orderService.getTracking(req.user.id, id);
  }

  // Phase 5: Enhanced order endpoints

  @Patch(":id/confirm")
  @ApiOperation({ summary: "确认收货 (Phase 5 enhanced)" })
  @ApiParam({ name: "id", description: "订单 ID" })
  async confirmReceipt(
    @Request() req: { user: { id: string } },
    @Param("id") id: string,
  ) {
    await this.orderService.confirmReceipt(req.user.id, id);
    return { success: true };
  }

  @Delete(":id")
  @ApiOperation({ summary: "软删除订单" })
  @ApiParam({ name: "id", description: "订单 ID" })
  async softDelete(
    @Request() req: { user: { id: string } },
    @Param("id") id: string,
  ) {
    return this.orderService.softDeleteOrder(req.user.id, id);
  }

  @Get("tab/:tab")
  @ApiOperation({ summary: "按标签页获取订单列表" })
  @ApiParam({ name: "tab", description: "标签页: all/pending/paid/shipped/completed/refund" })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getOrdersByTab(
    @Request() req: { user: { id: string } },
    @Param("tab") tab: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.orderService.getOrdersByTab(
      req.user.id,
      tab,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 10,
    );
  }
}
