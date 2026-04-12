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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { WardrobeService } from './wardrobe.service';
import { AddToWardrobeDto } from './dto/add-to-wardrobe.dto';
import { UpdateWardrobeItemDto } from './dto/update-wardrobe-item.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

type SortOption = 'added_at_asc' | 'added_at_desc' | 'category' | 'color';

@ApiTags('Wardrobe')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('wardrobe')
export class WardrobeController {
  constructor(private readonly wardrobeService: WardrobeService) {}

  @Get()
  @ApiOperation({ summary: '获取用户衣橱', description: '分页获取用户衣橱列表，支持按分类、颜色、品牌筛选和排序' })
  @ApiQuery({ name: 'category', required: false, description: '按分类筛选' })
  @ApiQuery({ name: 'color', required: false, description: '按颜色筛选' })
  @ApiQuery({ name: 'brand', required: false, description: '按品牌筛选' })
  @ApiQuery({ name: 'sort', required: false, enum: ['added_at_asc', 'added_at_desc', 'category', 'color'], description: '排序方式' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码(默认1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '每页数量(默认20)' })
  @ApiResponse({ status: 200, description: '返回衣橱列表' })
  @ApiResponse({ status: 401, description: '未认证' })
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
  @ApiOperation({ summary: '添加服装到衣橱', description: '将服装添加到用户衣橱，可自定义名称和备注' })
  @ApiResponse({ status: 201, description: '添加成功' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  add(
    @CurrentUser('id') userId: string,
    @Body() dto: AddToWardrobeDto,
  ) {
    return this.wardrobeService.add(userId, dto);
  }

  @Get('stats')
  @ApiOperation({ summary: '衣橱统计', description: '获取衣橱统计信息，含分类分布、颜色分布、品牌分布等' })
  @ApiResponse({ status: 200, description: '返回统计数据' })
  @ApiResponse({ status: 401, description: '未认证' })
  getStats(@CurrentUser('id') userId: string) {
    return this.wardrobeService.getStats(userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新衣橱项', description: '更新衣橱中某项的自定义名称、备注等信息' })
  @ApiParam({ name: 'id', description: '衣橱项ID (UUID)' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '衣橱项不存在' })
  @ApiResponse({ status: 401, description: '未认证' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWardrobeItemDto,
  ) {
    return this.wardrobeService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '从衣橱移除', description: '从用户衣橱中移除指定项' })
  @ApiParam({ name: 'id', description: '衣橱项ID (UUID)' })
  @ApiResponse({ status: 200, description: '移除成功' })
  @ApiResponse({ status: 404, description: '衣橱项不存在' })
  @ApiResponse({ status: 401, description: '未认证' })
  remove(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.wardrobeService.remove(userId, id);
  }
}
