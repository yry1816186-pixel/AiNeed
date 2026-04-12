import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { StylistService } from './stylist.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('Stylist')
@ApiBearerAuth()
@Controller('stylist')
@UseGuards(AuthGuard('jwt'))
export class StylistController {
  private readonly logger = new Logger(StylistController.name);

  constructor(private readonly stylistService: StylistService) {}

  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建聊天会话', description: '创建与AI造型师的新对话会话' })
  @ApiResponse({ status: 201, description: '会话创建成功' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  async createSession(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateSessionDto,
  ) {
    return this.stylistService.createSession(userId, dto);
  }

  @Get('sessions')
  @ApiOperation({ summary: '获取用户所有会话', description: '返回当前用户的所有AI造型师对话会话列表' })
  @ApiResponse({ status: 200, description: '返回会话列表' })
  @ApiResponse({ status: 401, description: '未认证' })
  async getSessions(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.stylistService.getSessions(
      userId,
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除会话', description: '删除指定的聊天会话及其所有消息' })
  @ApiParam({ name: 'sessionId', description: '会话ID (UUID)' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '会话不存在' })
  @ApiResponse({ status: 401, description: '未认证' })
  async deleteSession(
    @CurrentUser('id') userId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.stylistService.deleteSession(userId, sessionId);
  }

  @Get('sessions/:sessionId/messages')
  @ApiOperation({ summary: '获取历史消息', description: '获取指定会话的所有历史消息' })
  @ApiParam({ name: 'sessionId', description: '会话ID (UUID)' })
  @ApiResponse({ status: 200, description: '返回消息列表' })
  @ApiResponse({ status: 404, description: '会话不存在' })
  @ApiResponse({ status: 401, description: '未认证' })
  async getMessages(
    @CurrentUser('id') userId: string,
    @Param('sessionId') sessionId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.stylistService.getMessages(
      userId,
      sessionId,
      page ? parseInt(page, 10) : undefined,
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  @Post('sessions/:sessionId/messages')
  @ApiOperation({ summary: '发送消息（SSE流式响应）', description: '向AI造型师发送消息，以Server-Sent Events流式返回AI回复。响应Content-Type为text/event-stream' })
  @ApiParam({ name: 'sessionId', description: '会话ID (UUID)' })
  @ApiResponse({ status: 200, description: 'SSE流式响应，事件类型: token/done/error' })
  @ApiResponse({ status: 404, description: '会话不存在' })
  @ApiResponse({ status: 401, description: '未认证' })
  async sendMessage(
    @CurrentUser('id') userId: string,
    @Param('sessionId') sessionId: string,
    @Body() dto: SendMessageDto,
    @Req() _req: Request,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const sendSseEvent = (type: string, content: string) => {
      const data = JSON.stringify({ type, content });
      res.write(`data: ${data}\n\n`);
    };

    try {
      for await (const event of this.stylistService.streamChat(
        userId,
        sessionId,
        dto.content,
      )) {
        sendSseEvent(event.type, event.content);

        if (event.type === 'done' || event.type === 'error') {
          break;
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Stream error';
      this.logger.error(`SSE stream error: ${message}`);
      sendSseEvent('error', message);
    } finally {
      res.end();
    }
  }
}
