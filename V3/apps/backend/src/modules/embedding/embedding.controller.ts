import {
  Controller,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { EmbeddingService } from './embedding.service';
import { EmbedTextDto } from './dto/embed-text.dto';
import { EmbedBatchDto } from './dto/embed-batch.dto';
import { SearchSimilarDto } from './dto/search-similar.dto';
import { BatchIndexDto } from './dto/batch-index.dto';

@ApiTags('Embedding')
@ApiBearerAuth()
@Controller('embedding')
@UseGuards(AuthGuard('jwt'))
export class EmbeddingController {
  constructor(private readonly embeddingService: EmbeddingService) {}

  @Post('text')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '文本嵌入', description: '将文本转换为向量嵌入，使用FashionCLIP模型' })
  @ApiResponse({ status: 200, description: '返回嵌入向量' })
  @ApiResponse({ status: 401, description: '未认证' })
  async embedText(@Body() dto: EmbedTextDto) {
    return this.embeddingService.embedText(dto.text);
  }

  @Post('batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '批量文本嵌入', description: '批量将文本转换为向量嵌入' })
  @ApiResponse({ status: 200, description: '返回嵌入向量列表' })
  @ApiResponse({ status: 401, description: '未认证' })
  async embedBatch(@Body() dto: EmbedBatchDto) {
    return this.embeddingService.embedBatch(dto.texts);
  }

  @Post('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '语义搜索', description: '基于向量相似度的语义搜索，在Qdrant中查找最近邻' })
  @ApiResponse({ status: 200, description: '返回相似结果列表' })
  @ApiResponse({ status: 401, description: '未认证' })
  async searchSimilar(@Body() dto: SearchSimilarDto) {
    return this.embeddingService.searchSimilar(
      dto.query,
      dto.limit ?? 10,
      dto.threshold ?? 0.7,
      dto.filters,
    );
  }

  @Post('index/:clothingId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '索引单个服装', description: '将单个服装的向量嵌入索引到Qdrant' })
  @ApiParam({ name: 'clothingId', description: '服装ID (UUID)' })
  @ApiResponse({ status: 200, description: '索引成功' })
  @ApiResponse({ status: 404, description: '服装不存在' })
  @ApiResponse({ status: 401, description: '未认证' })
  async indexClothing(@Param('clothingId') clothingId: string) {
    return this.embeddingService.indexClothing(clothingId);
  }

  @Post('index/batch')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '批量索引服装', description: '批量将服装向量嵌入索引到Qdrant' })
  @ApiResponse({ status: 200, description: '批量索引成功' })
  @ApiResponse({ status: 401, description: '未认证' })
  async batchIndex(@Body() dto: BatchIndexDto) {
    return this.embeddingService.batchIndexClothing(dto.clothingIds);
  }
}
