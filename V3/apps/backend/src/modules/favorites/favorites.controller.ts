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
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { FavoritesService } from './favorites.service';
import { CreateFavoriteDto, TARGET_TYPES } from './dto/create-favorite.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('favorites')
@ApiBearerAuth()
@Controller('favorites')
@UseGuards(AuthGuard('jwt'))
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Post()
  @ApiOperation({ summary: '添加收藏' })
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateFavoriteDto,
  ) {
    return this.favoritesService.create(userId, dto);
  }

  @Delete(':targetType/:targetId')
  @ApiOperation({ summary: '取消收藏' })
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser('id') userId: string,
    @Param('targetType') targetType: string,
    @Param('targetId') targetId: string,
  ) {
    return this.favoritesService.remove(userId, targetType, targetId);
  }

  @Get()
  @ApiOperation({ summary: '收藏列表' })
  @ApiQuery({ name: 'target_type', required: false, enum: TARGET_TYPES })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
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
  @ApiOperation({ summary: '批量检查是否已收藏' })
  @ApiQuery({ name: 'target_type', required: true, enum: TARGET_TYPES })
  @ApiQuery({ name: 'target_ids', required: true, type: String })
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
  @ApiOperation({ summary: '收藏计数' })
  @ApiQuery({ name: 'target_type', required: false, enum: TARGET_TYPES })
  async count(
    @CurrentUser('id') userId: string,
    @Query('target_type') targetType?: string,
  ) {
    return this.favoritesService.count(userId, targetType);
  }
}
