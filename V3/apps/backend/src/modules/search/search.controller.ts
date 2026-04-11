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

@ApiTags('搜索')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: '全局搜索' })
  async search(
    @Query() dto: SearchQueryDto,
    @Request() req: { user?: { id: string } },
  ): Promise<SearchResponseDto> {
    const filters: SearchFilters = {
      colors: dto.colors ?? [],
      styles: dto.styles ?? [],
      priceRange: dto.priceRange ?? null,
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
  @ApiOperation({ summary: '搜索建议' })
  async suggest(@Query() dto: SuggestQueryDto): Promise<SuggestResponseDto> {
    const suggestions = await this.searchService.suggest(dto.q, dto.limit);
    return { suggestions };
  }

  @Get('hot')
  @ApiOperation({ summary: '热门搜索词' })
  async hotKeywords(): Promise<HotKeywordsResponseDto> {
    const keywords = await this.searchService.getHotKeywords();
    return { keywords };
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '用户搜索历史' })
  async history(@Request() req: { user: { id: string } }): Promise<SearchHistoryResponseDto> {
    const items = await this.searchService.getSearchHistory(req.user.id);
    return { items };
  }

  @Delete('history/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除单条搜索历史' })
  @ApiParam({ name: 'id', description: '搜索历史ID' })
  async deleteHistory(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ): Promise<{ success: boolean }> {
    const deleted = await this.searchService.deleteSearchHistory(req.user.id, id);
    return { success: deleted };
  }
}
