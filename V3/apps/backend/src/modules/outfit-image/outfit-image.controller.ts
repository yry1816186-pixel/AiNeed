import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OutfitImageService } from './outfit-image.service';
import { GenerateOutfitImageDto } from './dto/generate-outfit-image.dto';
import { OutfitImageQueryDto } from './dto/outfit-image-query.dto';

@ApiTags('OutfitImage')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('outfit-image')
export class OutfitImageController {
  constructor(private readonly outfitImageService: OutfitImageService) {}

  @Post('generate')
  @ApiOperation({ summary: '生成穿搭效果图', description: '根据搭配方案调用GLM-5文生图API生成穿搭效果图，异步处理返回任务ID' })
  @ApiResponse({ status: 202, description: '生成任务已提交，返回任务ID和状态' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  @HttpCode(HttpStatus.ACCEPTED)
  async generate(
    @CurrentUser('id') userId: string,
    @Body() dto: GenerateOutfitImageDto,
  ) {
    const result = await this.outfitImageService.generate(userId, dto);
    return { success: true, data: result };
  }

  @Get('history')
  @ApiOperation({ summary: '穿搭效果图历史记录', description: '获取当前用户的穿搭效果图生成历史，支持分页' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码(默认1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '每页数量(默认20)' })
  @ApiResponse({ status: 200, description: '返回历史记录列表' })
  @ApiResponse({ status: 401, description: '未认证' })
  async history(
    @CurrentUser('id') userId: string,
    @Query() query: OutfitImageQueryDto,
  ) {
    const result = await this.outfitImageService.history(userId, query);
    return { success: true, data: result.items, meta: result.meta };
  }

  @Get(':id')
  @ApiOperation({ summary: '获取穿搭效果图生成结果', description: '根据ID查询穿搭效果图的生成状态和结果URL' })
  @ApiParam({ name: 'id', description: '效果图记录ID (UUID)' })
  @ApiResponse({ status: 200, description: '返回效果图详情（含status和image_url）' })
  @ApiResponse({ status: 404, description: '记录不存在' })
  @ApiResponse({ status: 401, description: '未认证' })
  async getById(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    const result = await this.outfitImageService.getById(id, userId);
    return { success: true, data: result };
  }
}
