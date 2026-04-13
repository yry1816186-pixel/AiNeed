import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

export interface RetrievalResultItem {
  id: string;
  content: string;
  file_path: string;
  start_line: number;
  end_line: number;
  language: string;
  chunk_type: string;
  name: string | null;
  module: string;
  score: number;
}

export interface SearchResponse {
  results: RetrievalResultItem[];
  total: number;
  query_time_ms: number;
}

export interface SearchOptions {
  topK?: number;
  filterModule?: string;
  filterLanguage?: string;
  filterPathContains?: string;
  filterChunkType?: string;
  minScore?: number;
}

interface QdrantPoint {
  id: string | number;
  score: number;
  payload?: {
    content?: string;
    metadata?: {
      file_path?: string;
      start_line?: number;
      end_line?: number;
      language?: string;
      chunk_type?: string;
      name?: string | null;
      module?: string;
    };
  };
}

interface FileContextChunk {
  id: string | number;
  content: string;
  start_line: number;
  end_line: number;
  score: number;
}

export interface FileContext {
  file_path: string;
  chunks: FileContextChunk[];
  total_chunks: number;
  line_range: [number, number];
}

interface QdrantCollectionInfo {
  result?: {
    points_count?: number;
    vectors_count?: number;
    status?: string;
    config?: {
      params?: {
        vectors?: {
          size?: number;
        };
      };
    };
  };
}

export interface ProjectSummary {
  total_code_chunks: number;
  collection_info: {
    name: string;
    vectors_count: number;
    status: string;
  };
  languages: Record<string, number>;
  top_modules: Record<string, number>;
  chunk_types: Record<string, number>;
  error?: string;
}

export interface IndexStatus {
  indexed: boolean;
  message?: string;
  error?: string;
  collection?: string;
  total_chunks?: number;
  vector_size?: number;
  status?: string;
}

interface QdrantFilterCondition {
  key: string;
  match: { value: string };
}

interface QdrantFilter {
  must?: QdrantFilterCondition[];
}

@Injectable()
export class CodeRagService implements OnModuleInit {
  private readonly logger = new Logger(CodeRagService.name);
  private qdrantUrl!: string;
  private pythonRagUrl: string | null = null;
  private useDirectQdrant: boolean = true;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  onModuleInit() {
    this.qdrantUrl = this.configService.get<string>('QDRANT_URL', 'http://127.0.0.1:6333') ?? 'http://127.0.0.1:6333';
    this.pythonRagUrl = this.configService.get<string>('PYTHON_RAG_URL') ?? null;
    this.useDirectQdrant = !this.pythonRagUrl;
    this.logger.log(
      `CodeRAG initialized - Qdrant: ${this.qdrantUrl}, Mode: ${this.useDirectQdrant ? 'direct' : 'python-proxy'}`,
    );
  }

  async search(query: string, options: SearchOptions = {}): Promise<SearchResponse> {
    const startTime = Date.now();

    if (this.useDirectQdrant) {
      return this.searchViaQdrant(query, options, startTime);
    }
    return this.searchViaPythonProxy(query, options, startTime);
  }

  private async searchViaQdrant(
    query: string,
    options: SearchOptions,
    startTime: number,
  ): Promise<SearchResponse> {
    try {
      const vector = await this.generateQueryVector(query);

      const response = await firstValueFrom(
        this.httpService.post(`${this.qdrantUrl}/collections/xuno_code_index/points/search`, {
          vector: vector,
          limit: (options.topK || 10) * 3,
          with_payload: true,
          filter: this.buildFilter(options),
          search_params: { hnsw_ef: 64, exact: false },
        }),
      );

      let results = (response.data.result || []).map((point: QdrantPoint) => ({
        id: point.id,
        content: point.payload?.content || '',
        file_path: point.payload?.metadata?.file_path || '',
        start_line: point.payload?.metadata?.start_line || 0,
        end_line: point.payload?.metadata?.end_line || 0,
        language: point.payload?.metadata?.language || '',
        chunk_type: point.payload?.metadata?.chunk_type || '',
        name: point.payload?.metadata?.name || null,
        module: point.payload?.metadata?.module || '',
        score: point.score,
      }));

      if (options.filterPathContains) {
        const filterPath = options.filterPathContains;
        results = results.filter((r: RetrievalResultItem) =>
          r.file_path.includes(filterPath),
        );
      }

      if (options.minScore !== undefined) {
        const minScore = options.minScore;
        results = results.filter((r: RetrievalResultItem) => r.score >= minScore);
      }

      results = results.slice(0, options.topK || 10);

      return {
        results,
        total: results.length,
        query_time_ms: Date.now() - startTime,
      };
    } catch (error) {
      if (this.isAxiosError(error) && error.response?.status === 404) {
        return { results: [], total: 0, query_time_ms: Date.now() - startTime };
      }
      this.logger.error(`Qdrant search failed: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private isAxiosError(error: unknown): error is AxiosError {
    return (error as AxiosError).isAxiosError === true;
  }

  private async searchViaPythonProxy(
    query: string,
    options: SearchOptions,
    startTime: number,
  ): Promise<SearchResponse> {
    const response = await firstValueFrom(
      this.httpService.post(`${this.pythonRagUrl}/api/code-rag/search`, {
        query,
        top_k: options.topK || 10,
        filter_module: options.filterModule,
        filter_language: options.filterLanguage,
        filter_path_contains: options.filterPathContains,
        filter_chunk_type: options.filterChunkType,
      }),
    );

    return {
      results: response.data.results || [],
      total: response.data.total || 0,
      query_time_ms: Date.now() - startTime,
    };
  }

  async formatContextForLLM(results: RetrievalResultItem[], maxChars: number = 8000): Promise<string> {
    if (!results.length) return '';

    const sections: string[] = [];
    let totalChars = 0;

    sections.push(`# Relevant Code Context (${results.length} matches found)\n\n`);
    totalChars += (sections[0] ?? "").length;

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (!r) continue;
      const maxChunkChars = Math.floor(maxChars / Math.max(results.length, 1));
      const truncated = (r?.content ?? '').length > maxChunkChars
        ? (r?.content ?? '').slice(0, maxChunkChars) + '\n... (truncated)'
        : (r?.content ?? '');

      const header = `## ${r.file_path} (L${r.start_line}-${r.end_line}) [${r.chunk_type}${r.name ? `: ${r.name}` : ''}] score=${(r.score ?? 0).toFixed(2)}`;
      const body = `\`\`\`\n${truncated}\n\`\`\``;
      const entry = `\n### Match ${i + 1}\n${header}\n${body}\n`;

      if (totalChars + entry.length > maxChars) {
        sections.push(`\n<!-- Context truncated at ${maxChars} chars -->`);
        break;
      }
      sections.push(entry);
      totalChars += entry.length;
    }

    return sections.join('');
  }

  async getFileContext(filePath: string): Promise<FileContext | null> {
    try {
      const vector = await this.generateQueryVector(filePath);

      const response = await firstValueFrom(
        this.httpService.post(`${this.qdrantUrl}/collections/xuno_code_index/points/search`, {
          vector,
          limit: 50,
          with_payload: true,
          filter: {
            must: [
              { key: 'metadata.file_path', match: { value: filePath } },
            ],
          },
        }),
      );

      const docs = (response.data.result || [])
        .map((p: QdrantPoint) => ({
          id: p.id,
          content: p.payload?.content || '',
          start_line: p.payload?.metadata?.start_line || 0,
          end_line: p.payload?.metadata?.end_line || 0,
          score: p.score,
        }))
        .sort((a: FileContextChunk, b: FileContextChunk) => a.start_line - b.start_line);

      if (!docs.length) return null;

      return {
        file_path: filePath,
        chunks: docs,
        total_chunks: docs.length,
        line_range: [
          Math.min(...docs.map((d: FileContextChunk) => d.start_line)),
          Math.max(...docs.map((d: FileContextChunk) => d.end_line)),
        ],
      };
    } catch (error) {
      this.logger.error(`getFileContext failed: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  async getProjectSummary(): Promise<ProjectSummary> {
    try {
      const infoResponse = await firstValueFrom(
        this.httpService.get(`${this.qdrantUrl}/collections/xuno_code_index`),
      );
      const collectionInfo = (infoResponse.data as QdrantCollectionInfo)?.result;

      const scrollResponse = await firstValueFrom(
        this.httpService.post(`${this.qdrantUrl}/collections/xuno_code_index/points/scroll`, {
          limit: 5000,
          with_payload: true,
          with_vectors: false,
        }),
      );

      const docs = scrollResponse.data.result || [];
      const languages: Record<string, number> = {};
      const modules: Record<string, number> = {};
      const chunkTypes: Record<string, number> = {};

      for (const doc of docs) {
        const meta = doc.payload?.metadata || {};
        const lang = meta.language || 'unknown';
        const mod = meta.module || 'unknown';
        const ct = meta.chunk_type || 'unknown';

        languages[lang] = (languages[lang] || 0) + 1;
        modules[mod] = (modules[mod] || 0) + 1;
        chunkTypes[ct] = (chunkTypes[ct] || 0) + 1;
      }

      const sortedModules = Object.entries(modules)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 15);

      return {
        total_code_chunks: collectionInfo?.points_count || docs.length,
        collection_info: {
          name: 'xuno_code_index',
          vectors_count: collectionInfo?.vectors_count || 0,
          status: collectionInfo?.status || 'unknown',
        },
        languages: Object.fromEntries(
          Object.entries(languages).sort(([, a], [, b]) => (b as number) - (a as number)),
        ),
        top_modules: Object.fromEntries(sortedModules),
        chunk_types: chunkTypes,
      };
    } catch (error) {
      this.logger.error(`getProjectSummary failed: ${error instanceof Error ? error.message : String(error)}`);

        return {
          total_code_chunks: 0,
          error: error instanceof Error ? error.message : String(error),
          collection_info: {
            name: 'xuno_code_index',
            vectors_count: 0,
            status: 'error',
          },
          languages: {},
          top_modules: {},
          chunk_types: {},
        };
    }
  }

  async getIndexStatus(): Promise<IndexStatus> {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.qdrantUrl}/collections/xuno_code_index`),
      );

      const result = response.data?.result;
      if (!result) {
        return { indexed: false, message: 'Collection not found. Run code indexer first.' };
      }

      return {
        indexed: true,
        collection: 'xuno_code_index',
        total_chunks: result.points_count || 0,
        vector_size: result.config?.params?.vectors?.size || 384,
        status: result.status || 'unknown',
      };
    } catch (error) {
      if (this.isAxiosError(error) && error.response?.status === 404) {
        return { indexed: false, message: 'Collection not found. Run code indexer first.' };
      }
      return { indexed: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  private buildFilter(options: SearchOptions): QdrantFilter | undefined {
    const must: QdrantFilterCondition[] = [];

    if (options.filterModule) {
      must.push({ key: 'metadata.module', match: { value: options.filterModule } });
    }
    if (options.filterLanguage) {
      must.push({ key: 'metadata.language', match: { value: options.filterLanguage.toLowerCase() } });
    }
    if (options.filterChunkType) {
      must.push({ key: 'metadata.chunk_type', match: { value: options.filterChunkType.toLowerCase() } });
    }

    return must.length > 0 ? { must } : undefined;
  }

  private async generateQueryVector(query: string): Promise<number[]> {
    const text = `[query] ${query}`;

    try {
      const embeddingModel = this.configService.get<string>(
        'CODE_RAG_EMBEDDING_MODEL',
        'sentence-transformers/all-MiniLM-L6-v2',
      );

      const response = await firstValueFrom(
        this.httpService.post('http://127.0.0.1:5001/embed', {
          texts: [text],
          model: embeddingModel,
        }, {
          timeout: 10000,
        }),
      );

      return response.data.embeddings?.[0] || await this.fallbackEmbedding(text);
    } catch {

      return this.fallbackEmbedding(text);
    }
  }

  private async fallbackEmbedding(text: string): Promise<number[]> {
    const dim = 384;
    const hash = this.simpleHash(text);
    const base: number[] = [];

    for (let i = 0; i < dim; i++) {
      base.push(((hash * (i + 1) * 2654435769) & 0xffff) / 0xffff - 0.5);
    }

    const norm = Math.sqrt(base.reduce((sum, v) => sum + v * v, 0));
    return base.map((v) => v / norm);
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash + char) | 0;
    }
    return Math.abs(hash);
  }
}
