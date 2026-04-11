import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WardrobeService } from './wardrobe.service';
import { AddToWardrobeDto } from './dto/add-to-wardrobe.dto';
import { UpdateWardrobeItemDto } from './dto/update-wardrobe-item.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

type SortOption = 'added_at_asc' | 'added_at_desc' | 'category' | 'color';

@ApiTags('衣橱')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('wardrobe')
export class WardrobeController {
  constructor(private readonly wardrobeService: WardrobeService) {}

  @Get()
  @ApiOperation({ summary: '获取用户衣橱' })
  findAll(
    @CurrentUser('id') userId: string,
    @Query('category') category?: string,
    @Query('color') color?: string,
    @Query('brand') brand?: string,
    @Query('sort') sort?: SortOption,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.wardrobeService.findAll({
      userId,
      category,
      color,
      brand,
      sort,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @Post()
  @ApiOperation({ summary: '添加服装到衣橱' })
  add(
    @CurrentUser('id') userId: string,
    @Body() dto: AddToWardrobeDto,
  ) {
    return this.wardrobeService.add(userId, dto);
  }

  @Get('stats')
  @ApiOperation({ summary: '衣橱统计' })
  getStats(@CurrentUser('id') userId: string) {
    return this.wardrobeService.getStats(userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新衣橱项' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWardrobeItemDto,
  ) {
    return this.wardrobeService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '从衣橱移除' })
  remove(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.wardrobeService.remove(userId, id);
  }
}
