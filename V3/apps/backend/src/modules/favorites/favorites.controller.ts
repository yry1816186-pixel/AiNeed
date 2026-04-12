import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Body,
  Param,
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
import { FavoritesService } from './favorites.service';
import { CreateFavoriteDto, TARGET_TYPES } from './dto/create-favorite.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Favorites')
@ApiBearerAuth()
@Controller('favorites')
@UseGuards(AuthGuard('jwt'))
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post()
  @ApiOperation({ summary: '添加收藏', description: '收藏指定目标（服装/搭配/帖子/设计），重复收藏自动忽略' })
  @ApiResponse({ status: 201, description: '收藏成功' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateFavoriteDto,
  ) {
    return this.favoritesService.create(userId, dto);
  }

  @Delete(':targetType/:targetId')
  @ApiOperation({ summary: '取消收藏', description: '取消对指定目标的收藏' })
  @ApiParam({ name: 'targetType', description: '目标类型: clothing/outfit/post/design' })
  @ApiParam({ name: 'targetId', description: '目标ID (UUID)' })
  @ApiResponse({ status: 200, description: '取消成功' })
  @ApiResponse({ status: 404, description: '收藏记录不存在' })
  @ApiResponse({ status: 401, description: '未认证' })
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser('id') userId: string,
    @Param('targetType') targetType: string,
    @Param('targetId') targetId: string,
  ) {
    return this.favoritesService.remove(userId, targetType, targetId);
  }

  @Get()
  @ApiOperation({ summary: '收藏列表', description: '获取当前用户的收藏列表，支持按目标类型筛选和分页' })
  @ApiQuery({ name: 'target_type', required: false, enum: TARGET_TYPES, description: '目标类型筛选' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码(默认1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '每页数量(默认20)' })
  @ApiResponse({ status: 200, description: '返回收藏列表' })
  @ApiResponse({ status: 401, description: '未认证' })
  async findAll(
    @CurrentUser('id') userId: string,
    @Query('target_type') targetType?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.favoritesService.findAll(
      userId,
      targetType,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
  }

  @Get('check')
  @ApiOperation({ summary: '批量检查是否已收藏', description: '传入目标ID列表，返回每个目标的收藏状态' })
  @ApiQuery({ name: 'target_type', required: true, enum: TARGET_TYPES, description: '目标类型' })
  @ApiQuery({ name: 'target_ids', required: true, type: String, description: '目标ID列表，逗号分隔' })
  @ApiResponse({ status: 200, description: '返回收藏状态映射' })
  @ApiResponse({ status: 401, description: '未认证' })
  async check(
    @CurrentUser('id') userId: string,
    @Query('target_type') targetType: string,
    @Query('target_ids') targetIdsStr: string,
  ) {
    const targetIds = targetIdsStr
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    return this.favoritesService.check(userId, targetType, targetIds);
  }

  @Get('count')
  @ApiOperation({ summary: '收藏计数', description: '获取当前用户的收藏总数，可按目标类型筛选' })
  @ApiQuery({ name: 'target_type', required: false, enum: TARGET_TYPES, description: '目标类型筛选' })
  @ApiResponse({ status: 200, description: '返回收藏计数' })
  @ApiResponse({ status: 401, description: '未认证' })
  async count(
    @CurrentUser('id') userId: string,
    @Query('target_type') targetType?: string,
  ) {
    return this.favoritesService.count(userId, targetType);
  }
}
