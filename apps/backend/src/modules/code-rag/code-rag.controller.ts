import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { CodeRagService } from './code-rag.service';
import { CodeRagSearchDto, CodeRagFileContextDto } from './dto/code-rag.dto';

@ApiTags('code-rag')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('code-rag')
export class CodeRagController {
  constructor(private readonly codeRagService: CodeRagService) {}

  @Get('status')
  @ApiOperation({
    summary: 'Check code index status',
    description:
      'Returns whether the code index is built and ready for querying. Call /index endpoint to build the index if not ready.',
  })
  @ApiResponse({ status: 200, description: 'Index status' })
  async getStatus() {
    return this.codeRagService.getIndexStatus();
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Get project code summary',
    description:
      'Returns a high-level overview of the indexed codebase: language distribution, module breakdown, chunk types, etc.',
  })
  @ApiResponse({ status: 200, description: 'Project summary' })
  async getSummary() {
    return this.codeRagService.getProjectSummary();
  }

  @Post('search')
  @ApiOperation({
    summary: 'Search codebase semantically',
    description:
      'Search the codebase using natural language queries. Returns relevant code snippets ranked by semantic similarity. This is the main API for cloud AI to understand your code.',
  })
  @ApiResponse({ status: 200, description: 'Search results with relevant code snippets' })
  async search(@Body() dto: CodeRagSearchDto) {
    const results = await this.codeRagService.search(dto.query, {
      topK: dto.topK,
      filterModule: dto.filterModule,
      filterLanguage: dto.filterLanguage,
      filterPathContains: dto.filterPathContains,
      filterChunkType: dto.filterChunkType,
    });

    if (dto.formatForLlm) {
      const context = await this.codeRagService.formatContextForLLM(
        results.results,
        dto.maxContextChars,
      );
      return {
        context,
        metadata: {
          query: dto.query,
          matches_count: results.total,
          query_time_ms: results.query_time_ms,
          context_chars: context.length,
        },
      };
    }

    return results;
  }

  @Get('search')
  @ApiOperation({
    summary: 'Quick search (GET)',
    description: 'Quick code search via GET parameter. Convenient for browser testing and simple integrations.',
  })
  async quickSearch(
    @Query('q') query: string,
    @Query('topK') topK?: string,
    @Query('module') module?: string,
    @Query('language') language?: string,
    @Query('format') format?: string,
  ) {
    const results = await this.codeRagService.search(query, {
      topK: parseInt(topK || '10', 10),
      filterModule: module,
      filterLanguage: language,
    });

    if (format === 'llm' || format === 'context') {
      const context = await this.codeRagService.formatContextForLLM(results.results);
      return { context, matches_count: results.total };
    }

    return results;
  }

  @Post('file-context')
  @ApiOperation({
    summary: 'Get file context',
    description: 'Get all indexed code chunks for a specific file. Useful when you know exactly which file you need context about.',
  })
  @ApiResponse({ status: 200, description: 'File code context' })
  async getFileContext(@Body() dto: CodeRagFileContextDto) {
    return this.codeRagService.getFileContext(dto.filePath);
  }

  @Get('context-for-ai')
  @ApiOperation({
    summary: 'Get formatted context for Cloud AI',
    description:
      'The primary endpoint for cloud AI integration. Returns project context in a format optimized for LLM prompt injection. Includes: project summary, tech stack, architecture, and relevant code based on query.',
  })
  @ApiResponse({ status: 200, description: 'Formatted AI-ready context' })
  async getContextForAI(
    @Query('q') query: string = '',
    @Query('focus') focus?: string,
  ) {
    const [summary, searchResults] = await Promise.all([
      this.codeRagService.getProjectSummary(),
      query
        ? this.codeRagService.search(query, { topK: 8, filterModule: focus })
        : Promise.resolve({ results: [], total: 0, query_time_ms: 0 }),
    ]);

    const codeContext = searchResults.results.length
      ? await this.codeRagService.formatContextForLLM(searchResults.results, 6000)
      : '';

    return {
      project_info: {
        name: '寻裳',
        type: 'Full-stack AI Fashion Platform',
        tech_stack: {
          backend: 'NestJS 11.x + TypeScript + Prisma + PostgreSQL',
          mobile: 'React Native 0.76.8 (Expo 52) + TypeScript',
          ml: 'Python + FastAPI + GLM-5 (ZhipuAI)',
          infrastructure: 'Redis + MinIO + Docker',
        },
        architecture: 'Monorepo (apps/backend, apps/mobile, ml/, packages/)',
        api_base: '/api/v1/',
        health_score: 78,
        code_stats: {
          total_indexed_chunks: summary.total_code_chunks,
          languages: summary.languages,
          top_modules: summary.top_modules,
        },
      },
      code_context: codeContext,
      usage: {
        query: query || '(no query - returning summary only)',
        matches_found: searchResults.total,
        response_format: 'optimized_for_llm_prompt_injection',
      },
      instructions: codeContext
        ? 'Inject the `code_context` field into your system prompt or as conversation context.'
        : 'No specific code matched. Use project_info above for general context. Build the code index first if needed.',
    };
  }
}
