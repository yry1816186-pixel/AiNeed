import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";

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
  async findOne(
    @Request() req: { user: { id: string } },
    @Param("id") id: string,
  ) {
    return this.orderService.findOne(req.user.id, id);
  }

  @Post()
  @ApiOperation({ summary: "创建订单" })
  async create(
    @Request() req: { user: { id: string } },
    @Body() dto: CreateOrderDto,
  ) {
    return this.orderService.create(req.user.id, dto);
  }

  @Post(":id/pay")
  @ApiOperation({ summary: "支付订单" })
  async pay(
    @Request() req: { user: { id: string } },
    @Param("id") id: string,
    @Body() body: { paymentMethod: string },
  ) {
    return this.orderService.pay(req.user.id, id, body.paymentMethod);
  }

  @Post(":id/cancel")
  @ApiOperation({ summary: "取消订单" })
  async cancel(
    @Request() req: { user: { id: string } },
    @Param("id") id: string,
  ) {
    await this.orderService.cancel(req.user.id, id);
    return { success: true };
  }

  @Post(":id/confirm")
  @ApiOperation({ summary: "确认收货" })
  async confirm(
    @Request() req: { user: { id: string } },
    @Param("id") id: string,
  ) {
    await this.orderService.confirm(req.user.id, id);
    return { success: true };
  }

  @Get(":id/tracking")
  @ApiOperation({ summary: "获取物流信息" })
  async getTracking(
    @Request() req: { user: { id: string } },
    @Param("id") id: string,
  ) {
    return this.orderService.getTracking(req.user.id, id);
  }
}
