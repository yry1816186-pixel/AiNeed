import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { StylistService } from './stylist.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { SendMessageDto } from './dto/send-message.dto';

@ApiTags('AI造型师')
@ApiBearerAuth()
@Controller('stylist')
@UseGuards(AuthGuard('jwt'))
export class StylistController {
  private readonly logger = new Logger(StylistController.name);

  constructor(private readonly stylistService: StylistService) {}

  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建聊天会话' })
  async createSession(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateSessionDto,
  ) {
    return this.stylistService.createSession(userId, dto);
  }

  @Get('sessions')
  @ApiOperation({ summary: '获取用户所有会话' })
  async getSessions(@CurrentUser('id') userId: string) {
    return this.stylistService.getSessions(userId);
  }

  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '删除会话' })
  async deleteSession(
    @CurrentUser('id') userId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.stylistService.deleteSession(userId, sessionId);
  }

  @Get('sessions/:sessionId/messages')
  @ApiOperation({ summary: '获取历史消息' })
  async getMessages(
    @CurrentUser('id') userId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.stylistService.getMessages(userId, sessionId);
  }

  @Post('sessions/:sessionId/messages')
  @ApiOperation({ summary: '发送消息（SSE流式响应）' })
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
