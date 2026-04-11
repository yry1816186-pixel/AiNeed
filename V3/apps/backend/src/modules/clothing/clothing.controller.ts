import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ClothingService } from './clothing.service';
import { ClothingQueryDto } from './dto/clothing-query.dto';
import { CreateClothingDto } from './dto/create-clothing.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('服装')
@Controller('clothing')
export class ClothingController {
  constructor(private readonly clothingService: ClothingService) {}

  @Get()
  @ApiOperation({ summary: '服装列表（分页+过滤+排序）' })
  @ApiResponse({ status: 200, description: '返回分页服装列表' })
  async findAll(@Query() query: ClothingQueryDto) {
    return this.clothingService.findAll(query);
  }

  @Get('categories')
  @ApiOperation({ summary: '分类列表（树形结构）' })
  @ApiResponse({ status: 200, description: '返回分类树' })
  async getCategories() {
    return this.clothingService.getCategories();
  }

  @Get('brands')
  @ApiOperation({ summary: '品牌列表' })
  @ApiResponse({ status: 200, description: '返回品牌列表' })
  async getBrands() {
    return this.clothingService.getBrands();
  }

  @Get('recommendations')
  @ApiBearerAuth()
  @ApiOperation({ summary: '个性化推荐列表' })
  @ApiResponse({ status: 200, description: '返回个性化推荐服装列表' })
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
  @ApiOperation({ summary: '服装详情' })
  @ApiParam({ name: 'id', description: '服装ID' })
  @ApiResponse({ status: 200, description: '返回服装详情（含品牌和分类）' })
  @ApiResponse({ status: 404, description: '服装不存在' })
  async findOne(@Param('id') id: string) {
    return this.clothingService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: '创建服装（管理员）' })
  @ApiResponse({ status: 201, description: '创建成功' })
  async create(@Body() dto: CreateClothingDto) {
    return this.clothingService.create(dto);
  }
}
