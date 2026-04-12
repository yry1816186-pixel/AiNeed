import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ClothingService } from './clothing.service';
import { ClothingQueryDto } from './dto/clothing-query.dto';
import { CreateClothingDto } from './dto/create-clothing.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Clothing')
@Controller('clothing')
export class ClothingController {
  constructor(private readonly clothingService: ClothingService) {}

  @Get()
  @ApiOperation({ summary: '服装列表', description: '分页+过滤+排序查询服装商品列表，支持按分类、品牌、性别、季节、场合等筛选' })
  @ApiResponse({ status: 200, description: '返回分页服装列表' })
  async findAll(@Query() query: ClothingQueryDto) {
    return this.clothingService.findAll(query);
  }

  @Get('categories')
  @ApiOperation({ summary: '分类列表', description: '返回树形结构的服装分类' })
  @ApiResponse({ status: 200, description: '返回分类树' })
  async getCategories() {
    return this.clothingService.getCategories();
  }

  @Get('brands')
  @ApiOperation({ summary: '品牌列表', description: '返回所有品牌' })
  @ApiResponse({ status: 200, description: '返回品牌列表' })
  async getBrands() {
    return this.clothingService.getBrands();
  }

  @Get('recommendations')
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: '个性化推荐列表', description: '基于用户画像、风格偏好、历史行为的个性化服装推荐' })
  @ApiResponse({ status: 200, description: '返回个性化推荐服装列表' })
  @ApiResponse({ status: 401, description: '未认证' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码(默认1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '每页数量(默认20)' })
  async getRecommendations(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.clothingService.getRecommendations(userId, pageNum, limitNum);
  }

  @Get(':id')
  @ApiOperation({ summary: '服装详情', description: '获取单个服装商品详情，含品牌和分类信息' })
  @ApiParam({ name: 'id', description: '服装ID (UUID)' })
  @ApiResponse({ status: 200, description: '返回服装详情（含品牌和分类）' })
  @ApiResponse({ status: 404, description: '服装不存在' })
  async findOne(@Param('id') id: string) {
    return this.clothingService.findOne(id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: '创建服装（管理员）', description: '管理员创建新的服装商品' })
  @ApiResponse({ status: 201, description: '创建成功' })
  @ApiResponse({ status: 403, description: '权限不足' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  @ApiResponse({ status: 401, description: '未认证' })
  async create(@Body() dto: CreateClothingDto) {
    return this.clothingService.create(dto);
  }
}
