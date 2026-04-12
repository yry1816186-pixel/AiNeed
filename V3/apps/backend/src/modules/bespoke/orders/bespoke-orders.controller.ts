import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { BespokeOrdersService } from './bespoke-orders.service';
import {
  CreateBespokeOrderDto,
  SendMessageDto,
  CreateQuoteDto,
  CreateReviewDto,
  CancelOrderDto,
  BespokeOrderStatus,
} from './dto/bespoke.dto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Bespoke')
@ApiBearerAuth()
@Controller('bespoke')
@UseGuards(AuthGuard('jwt'))
export class BespokeOrdersController {
  constructor(private readonly bespokeOrdersService: BespokeOrdersService) {}

  @Post('orders')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '提交定制需求', description: '向工作室提交高端定制需求' })
  @ApiResponse({ status: 201, description: '提交成功' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  async createOrder(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateBespokeOrderDto,
  ) {
    return this.bespokeOrdersService.createOrder(userId, dto);
  }

  @Get('orders')
  @ApiOperation({ summary: '我的定制订单列表', description: '获取当前用户的定制订单列表，支持分页和状态筛选' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码(默认1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '每页数量(默认20)' })
  @ApiQuery({ name: 'status', required: false, type: String, description: '按状态筛选: pending/quoted/accepted/in_progress/completed/cancelled' })
  @ApiResponse({ status: 200, description: '返回订单列表' })
  @ApiResponse({ status: 401, description: '未认证' })
  async getOrders(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.bespokeOrdersService.getOrders(
      userId,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
      status,
    );
  }

  @Get('orders/:id')
  @ApiOperation({ summary: '订单详情', description: '获取定制订单详情，含沟通记录和报价信息' })
  @ApiParam({ name: 'id', description: '订单ID (UUID)' })
  @ApiResponse({ status: 200, description: '返回订单详情' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  @ApiResponse({ status: 401, description: '未认证' })
  async getOrderById(
    @CurrentUser('id') userId: string,
    @Param('id') orderId: string,
  ) {
    return this.bespokeOrdersService.getOrderById(userId, orderId);
  }

  @Patch('orders/:id/cancel')
  @ApiOperation({ summary: '取消订单', description: '取消定制订单，需提供取消原因' })
  @ApiParam({ name: 'id', description: '订单ID (UUID)' })
  @ApiResponse({ status: 200, description: '取消成功' })
  @ApiResponse({ status: 400, description: '订单状态不允许取消' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  @ApiResponse({ status: 401, description: '未认证' })
  async cancelOrder(
    @CurrentUser('id') userId: string,
    @Param('id') orderId: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.bespokeOrdersService.cancelOrder(userId, orderId, dto);
  }

  @Get('orders/:id/messages')
  @ApiOperation({ summary: '沟通消息列表', description: '获取订单的沟通消息历史，支持分页' })
  @ApiParam({ name: 'id', description: '订单ID (UUID)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码(默认1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '每页数量(默认20)' })
  @ApiResponse({ status: 200, description: '返回消息列表' })
  @ApiResponse({ status: 401, description: '未认证' })
  async getMessages(
    @CurrentUser('id') userId: string,
    @Param('id') orderId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.bespokeOrdersService.getMessages(
      userId,
      orderId,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }

  @Post('orders/:id/messages')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '发送消息', description: '向订单对方发送沟通消息' })
  @ApiParam({ name: 'id', description: '订单ID (UUID)' })
  @ApiResponse({ status: 201, description: '发送成功' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  @ApiResponse({ status: 401, description: '未认证' })
  async sendMessage(
    @CurrentUser('id') userId: string,
    @Param('id') orderId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.bespokeOrdersService.sendMessage(userId, orderId, dto);
  }

  @Post('orders/:id/quotes')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '工作室发送报价', description: '工作室主理人对订单发送报价（仅工作室主理人可用）' })
  @ApiParam({ name: 'id', description: '订单ID (UUID)' })
  @ApiResponse({ status: 201, description: '报价发送成功' })
  @ApiResponse({ status: 403, description: '非工作室主理人' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  @ApiResponse({ status: 401, description: '未认证' })
  async createQuote(
    @CurrentUser('id') userId: string,
    @Param('id') orderId: string,
    @Body() dto: CreateQuoteDto,
  ) {
    return this.bespokeOrdersService.createQuote(userId, orderId, dto);
  }

  @Get('orders/:id/quotes')
  @ApiOperation({ summary: '获取报价列表', description: '获取订单的所有报价记录' })
  @ApiParam({ name: 'id', description: '订单ID (UUID)' })
  @ApiResponse({ status: 200, description: '返回报价列表' })
  @ApiResponse({ status: 401, description: '未认证' })
  async getQuotes(
    @CurrentUser('id') userId: string,
    @Param('id') orderId: string,
  ) {
    return this.bespokeOrdersService.getQuotes(userId, orderId);
  }

  @Patch('quotes/:id/accept')
  @ApiOperation({ summary: '用户接受报价', description: '用户接受工作室的报价，订单进入制作阶段' })
  @ApiParam({ name: 'id', description: '报价ID (UUID)' })
  @ApiResponse({ status: 200, description: '接受成功' })
  @ApiResponse({ status: 400, description: '报价状态不允许接受' })
  @ApiResponse({ status: 404, description: '报价不存在' })
  @ApiResponse({ status: 401, description: '未认证' })
  async acceptQuote(
    @CurrentUser('id') userId: string,
    @Param('id') quoteId: string,
  ) {
    return this.bespokeOrdersService.acceptQuote(userId, quoteId);
  }

  @Patch('quotes/:id/reject')
  @ApiOperation({ summary: '用户拒绝报价', description: '用户拒绝工作室的报价' })
  @ApiParam({ name: 'id', description: '报价ID (UUID)' })
  @ApiResponse({ status: 200, description: '拒绝成功' })
  @ApiResponse({ status: 400, description: '报价状态不允许拒绝' })
  @ApiResponse({ status: 404, description: '报价不存在' })
  @ApiResponse({ status: 401, description: '未认证' })
  async rejectQuote(
    @CurrentUser('id') userId: string,
    @Param('id') quoteId: string,
  ) {
    return this.bespokeOrdersService.rejectQuote(userId, quoteId);
  }

  @Post('orders/:id/review')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '提交评价', description: '订单完成后用户提交评价' })
  @ApiParam({ name: 'id', description: '订单ID (UUID)' })
  @ApiResponse({ status: 201, description: '评价提交成功' })
  @ApiResponse({ status: 400, description: '订单未完成或已评价' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  @ApiResponse({ status: 401, description: '未认证' })
  async createReview(
    @CurrentUser('id') userId: string,
    @Param('id') orderId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.bespokeOrdersService.createReview(userId, orderId, dto);
  }

  @Get('studio/orders')
  @ApiOperation({ summary: '工作室收到的新订单', description: '工作室主理人查看收到的新定制订单（仅工作室主理人可用）' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码(默认1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '每页数量(默认20)' })
  @ApiQuery({ name: 'status', required: false, type: String, description: '按状态筛选' })
  @ApiResponse({ status: 200, description: '返回订单列表' })
  @ApiResponse({ status: 401, description: '未认证' })
  async getStudioOrders(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.bespokeOrdersService.getStudioOrders(
      userId,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
      status,
    );
  }

  @Patch('studio/orders/:id/status')
  @ApiOperation({ summary: '工作室更新订单状态', description: '工作室主理人更新订单状态（仅工作室主理人可用）' })
  @ApiParam({ name: 'id', description: '订单ID (UUID)' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 403, description: '非工作室主理人' })
  @ApiResponse({ status: 404, description: '订单不存在' })
  @ApiResponse({ status: 401, description: '未认证' })
  async updateOrderStatus(
    @CurrentUser('id') userId: string,
    @Param('id') orderId: string,
    @Body() body: { status: string; note?: string },
  ) {
    return this.bespokeOrdersService.updateOrderStatus(
      userId,
      orderId,
      body.status as BespokeOrderStatus,
      body.note,
    );
  }
}
