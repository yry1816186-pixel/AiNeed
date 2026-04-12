import {
  Controller,
  Get,
  Delete,
  Query,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SearchService } from './search.service';
import { SearchQueryDto, SuggestQueryDto, SearchType } from './dto/search-query.dto';
import {
  SearchResponseDto,
  SuggestResponseDto,
  HotKeywordsResponseDto,
  SearchHistoryResponseDto,
  SearchFilters,
  SearchPagination,
} from './dto/search-response.dto';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: '全局搜索', description: '全文+语义混合搜索，支持按服装/社区/设计等类型搜索，支持颜色/风格/价格/品牌筛选' })
  @ApiQuery({ name: 'q', required: true, description: '搜索关键词' })
  @ApiQuery({ name: 'type', required: false, enum: ['all', 'clothing', 'post', 'design'], description: '搜索类型' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码(默认1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '每页数量(默认20)' })
  @ApiResponse({ status: 200, description: '返回搜索结果', type: SearchResponseDto })
  async search(
    @Query() dto: SearchQueryDto,
    @Request() req: { user?: { id: string } },
  ): Promise<SearchResponseDto> {
    const filters: SearchFilters = {
      colors: dto.colors ?? [],
      styles: dto.styles ?? [],
      priceRange: dto.priceRange && dto.priceRange.length > 0 ? dto.priceRange : null,
      brands: dto.brands ?? [],
    };

    const pagination: SearchPagination = {
      page: dto.page,
      limit: dto.limit,
    };

    const userId = req.user?.id;
    const result = await this.searchService.search(
      dto.q,
      dto.type ?? SearchType.ALL,
      filters,
      pagination,
      userId,
    );

    return result;
  }

  @Get('suggestions')
  @ApiOperation({ summary: '搜索建议', description: '输入前缀获取搜索建议词，用于搜索框自动补全' })
  @ApiQuery({ name: 'q', required: true, description: '搜索前缀' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '返回数量(默认5)' })
  @ApiResponse({ status: 200, description: '返回建议列表', type: SuggestResponseDto })
  async suggest(@Query() dto: SuggestQueryDto): Promise<SuggestResponseDto> {
    const suggestions = await this.searchService.suggest(dto.q, dto.limit);
    return { suggestions };
  }

  @Get('hot')
  @ApiOperation({ summary: '热门搜索词', description: '获取当前热门搜索关键词，基于用户搜索频率统计' })
  @ApiResponse({ status: 200, description: '返回热门关键词列表', type: HotKeywordsResponseDto })
  async hotKeywords(): Promise<HotKeywordsResponseDto> {
    const keywords = await this.searchService.getHotKeywords();
    return { keywords };
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '用户搜索历史', description: '获取当前用户的搜索历史记录' })
  @ApiResponse({ status: 200, description: '返回搜索历史', type: SearchHistoryResponseDto })
  @ApiResponse({ status: 401, description: '未认证' })
  async history(@Request() req: { user: { id: string } }): Promise<SearchHistoryResponseDto> {
    const items = await this.searchService.getSearchHistory(req.user.id);
    return { items };
  }

  @Delete('history/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除单条搜索历史', description: '删除指定的搜索历史记录' })
  @ApiParam({ name: 'id', description: '搜索历史ID (UUID)' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '记录不存在' })
  @ApiResponse({ status: 401, description: '未认证' })
  async deleteHistory(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ): Promise<{ success: boolean }> {
    const deleted = await this.searchService.deleteSearchHistory(req.user.id, id);
    return { success: deleted };
  }
}
