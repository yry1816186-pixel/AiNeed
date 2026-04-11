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
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EmbeddingService } from './embedding.service';
import { EmbedTextDto } from './dto/embed-text.dto';
import { EmbedBatchDto } from './dto/embed-batch.dto';
import { SearchSimilarDto } from './dto/search-similar.dto';
import { BatchIndexDto } from './dto/batch-index.dto';

@ApiTags('向量嵌入')
@Controller('embedding')
export class EmbeddingController {
  constructor(private readonly embeddingService: EmbeddingService) {}

  @Post('text')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '文本嵌入' })
  async embedText(@Body() dto: EmbedTextDto) {
    return this.embeddingService.embedText(dto.text);
  }

  @Post('batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '批量文本嵌入' })
  async embedBatch(@Body() dto: EmbedBatchDto) {
    return this.embeddingService.embedBatch(dto.texts);
  }

  @Post('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '语义搜索' })
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
  @ApiOperation({ summary: '索引单个服装' })
  async indexClothing(@Param('clothingId') clothingId: string) {
    return this.embeddingService.indexClothing(clothingId);
  }

  @Post('index/batch')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: '批量索引服装' })
  async batchIndex(@Body() dto: BatchIndexDto) {
    return this.embeddingService.batchIndexClothing(dto.clothingIds);
  }
}
