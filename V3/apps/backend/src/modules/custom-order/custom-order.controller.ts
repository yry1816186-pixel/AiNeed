import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { CustomOrderService } from './custom-order.service';
import { CreateCustomOrderDto } from './dto/create-custom-order.dto';
import {
  CustomOrderResponseDto,
  CustomOrderDetailResponseDto,
  CustomOrderListResponseDto,
  TrackingResponseDto,
} from './dto/custom-order-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('CustomOrder')
@ApiBearerAuth()
@Controller('custom-orders')
@UseGuards(JwtAuthGuard)
export class CustomOrderController {
  constructor(private readonly customOrderService: CustomOrderService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建定制订单', description: '基于设计创建EPROLO POD定制订单（MVP全Mock）' })
  @ApiResponse({ status: 201, description: '创建成功', type: CustomOrderResponseDto })
  @ApiResponse({ status: 404, description: '设计不存在' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCustomOrderDto,
  ) {
    return this.customOrderService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: '获取我的订单列表', description: '获取当前用户的定制订单列表，支持按状态筛选' })
  @ApiQuery({ name: 'status', required: false, description: '按状态筛选: pending/paid/producing/shipped/done/refunded' })
  @ApiResponse({ status: 200, description: '获取成功', type: CustomOrderListResponseDto })
  @ApiResponse({ status: 401, description: '未认证' })
  findAll(
    @CurrentUser('id') userId: string,
    @Query('status') status?: string,
  ) {
    return this.customOrderService.findAll(userId, status);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取订单详情', description: '获取定制订单详细信息，含设计、支付、物流信息' })
  @ApiParam({ name: 'id', description: '订单ID (UUID)' })
  @ApiResponse({ status: 200, description: '获取成功', type: CustomOrderDetailResponseDto })
  @ApiResponse({ status: 404, description: '订单不存在' })
  @ApiResponse({ status: 401, description: '未认证' })
  findOne(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.customOrderService.findOne(userId, id);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: '取消订单', description: '取消定制订单，仅待付款状态可取消' })
  @ApiParam({ name: 'id', description: '订单ID (UUID)' })
  @ApiResponse({ status: 200, description: '取消成功', type: CustomOrderResponseDto })
  @ApiResponse({ status: 400, description: '仅待付款订单可取消' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  @ApiResponse({ status: 401, description: '未认证' })
  cancel(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.customOrderService.cancel(userId, id);
  }

  @Post(':id/pay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '模拟支付', description: '模拟支付流程，将订单状态从pending变为paid（MVP全Mock）' })
  @ApiParam({ name: 'id', description: '订单ID (UUID)' })
  @ApiResponse({ status: 200, description: '支付成功', type: CustomOrderResponseDto })
  @ApiResponse({ status: 400, description: '仅待付款订单可支付' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  @ApiResponse({ status: 401, description: '未认证' })
  pay(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.customOrderService.pay(userId, id);
  }

  @Get(':id/track')
  @ApiOperation({ summary: '物流追踪', description: '获取定制订单的物流追踪信息' })
  @ApiParam({ name: 'id', description: '订单ID (UUID)' })
  @ApiResponse({ status: 200, description: '获取成功', type: TrackingResponseDto })
  @ApiResponse({ status: 400, description: '订单尚未提交生产' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  @ApiResponse({ status: 401, description: '未认证' })
  track(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.customOrderService.track(userId, id);
  }
}
