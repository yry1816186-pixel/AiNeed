import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Logger,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Request } from "express";

import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

import {
  CreatePaymentDto,
  QueryPaymentDto,
  RefundPaymentDto,
  ClosePaymentDto,
  PaymentResponseDto,
  PaymentStatusResponseDto,
  RefundResponseDto,
  PaymentListResponseDto,
} from "./dto";
import { PaymentService } from "./payment.service";
import { PaymentProvider } from "./providers/payment-provider.interface";
import { PaymentRawCallbackData } from "./types/common.types";

@ApiTags("payment")
@Controller("payment")
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(private readonly paymentService: PaymentService) {}

  /**
   * 创建支付订单
   */
  @Post("create")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "创建支付订单" })
  @ApiResponse({
    status: 201,
    description: "支付订单创建成功",
    type: PaymentResponseDto,
  })
  @ApiResponse({ status: 400, description: "请求参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  async createPayment(
    @CurrentUser() user: { id: string },
    @Body() dto: CreatePaymentDto,
    @Req() req: Request,
  ): Promise<PaymentResponseDto> {
    // 获取客户端 IP
    const clientIp = this.getClientIp(req);
    const result = await this.paymentService.createPayment(user.id, {
      ...dto,
      clientIp,
    });

    return result;
  }

  /**
   * 查询支付状态
   */
  @Get("query/:orderId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "查询支付状态" })
  @ApiParam({ name: "orderId", description: "订单 ID" })
  @ApiResponse({
    status: 200,
    description: "查询成功",
    type: PaymentStatusResponseDto,
  })
  @ApiResponse({ status: 404, description: "订单不存在" })
  async queryPayment(
    @CurrentUser() user: { id: string },
    @Param("orderId") orderId: string,
  ): Promise<PaymentStatusResponseDto> {
    return this.paymentService.queryPayment(user.id, orderId);
  }

  // FIX-CODE-017: 支付轮询添加频率限制 (修复时间: 2026-03-19)
  @Get("poll/:orderId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Throttle({ default: { limit: 30, ttl: 60000 } }) // 1分钟最多30次
  @ApiOperation({ summary: "轮询支付状态" })
  @ApiParam({ name: "orderId", description: "订单 ID" })
  @ApiResponse({ status: 200, description: "轮询成功" })
  async pollPaymentStatus(
    @CurrentUser() user: { id: string },
    @Param("orderId") orderId: string,
  ): Promise<{ paid: boolean; status: string }> {
    return this.paymentService.pollPaymentStatus(user.id, orderId);
  }

  // FIX-CODE-007: 支付宝回调添加签名验证前置检查 (修复时间: 2026-03-19)
  /**
   * 支付宝回调
   */
  @Post("callback/alipay")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "支付宝支付回调" })
  @ApiResponse({ status: 200, description: "回调处理成功" })
  async alipayCallback(
    @Body() body: PaymentRawCallbackData,
    @Req() req: Request,
  ): Promise<string> {
    this.logger.log("Received Alipay callback");

    // 验证签名
    const isValid = await this.paymentService.verifyAlipaySignature(body);
    if (!isValid) {
      this.logger.warn("Invalid Alipay callback signature");
      return "fail";
    }

    const result = await this.paymentService.handleCallback("alipay", body);

    // 支付宝要求返回 success 或 fail
    if (result.success) {
      return "success";
    }
    return "fail";
  }

  /**
   * 微信支付回调
   */
  @Post("callback/wechat")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "微信支付回调" })
  @ApiResponse({ status: 200, description: "回调处理成功" })
  async wechatCallback(
    @Body() body: PaymentRawCallbackData,
    @Req() req: Request,
  ): Promise<{ code: string; message: string }> {
    this.logger.log("Received Wechat callback");

    const result = await this.paymentService.handleCallback("wechat", {
      headers: req.headers,
      body,
    });

    // 微信支付要求返回 JSON 格式
    if (result.success) {
      return { code: "SUCCESS", message: "成功" };
    }
    return { code: "FAIL", message: result.message };
  }

  /**
   * 申请退款
   */
  @Post("refund")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "申请退款" })
  @ApiResponse({
    status: 200,
    description: "退款申请成功",
    type: RefundResponseDto,
  })
  @ApiResponse({ status: 400, description: "退款申请失败" })
  @ApiResponse({ status: 404, description: "订单不存在" })
  async refund(
    @CurrentUser() user: { id: string },
    @Body() dto: RefundPaymentDto,
  ): Promise<RefundResponseDto> {
    return this.paymentService.refund(user.id, dto);
  }

  /**
   * 关闭订单
   */
  @Post("close")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "关闭订单" })
  @ApiResponse({ status: 200, description: "订单关闭成功" })
  @ApiResponse({ status: 400, description: "订单关闭失败" })
  @ApiResponse({ status: 404, description: "订单不存在" })
  async closeOrder(
    @CurrentUser() user: { id: string },
    @Body() dto: ClosePaymentDto,
  ): Promise<{ success: boolean }> {
    const result = await this.paymentService.closeOrder(user.id, dto.orderId);
    return { success: result };
  }

  /**
   * 获取支付记录列表
   */
  @Get("records")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "获取支付记录列表" })
  @ApiResponse({
    status: 200,
    description: "查询成功",
    type: PaymentListResponseDto,
  })
  async getPaymentRecords(
    @CurrentUser() user: { id: string },
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ): Promise<PaymentListResponseDto> {
    return this.paymentService.getPaymentRecords(
      user.id,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 10,
    );
  }

  /**
   * 获取客户端 IP
   */
  private getClientIp(req: Request): string {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
      return forwarded.split(",")[0]?.trim() || req.ip || "127.0.0.1";
    }
    if (Array.isArray(forwarded) && forwarded.length > 0) {
      return forwarded[0]?.trim() || req.ip || "127.0.0.1";
    }
    return req.ip || "127.0.0.1";
  }
}
