/* eslint-disable @typescript-eslint/no-explicit-any */
import crypto from 'crypto';

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

interface JDImageInfo {
  imageList?: string;
  whiteImage?: string;
}

interface JDCategoryInfo {
  cid1Name?: string;
  cid2Name?: string;
}

interface JDItem {
  skuId?: string | number;
  skuName?: string;
  brandName?: string;
  price?: number | string;
  originalPrice?: number | string;
  imageInfo?: JDImageInfo;
  categoryInfo?: JDCategoryInfo;
  materialUrl?: string;
  goodCommentsShare?: number | string;
  inOrderCount30Days?: number | string;
}

interface ClothingItem {
  id: string;
  name: string;
  brand?: string;
  price: number;
  originalPrice?: number;
  currency: string;
  images: string[];
  mainImage: string;
  category: string;
  subcategory?: string;
  description?: string;
  sizes?: string[];
  colors?: string[];
  material?: string;
  source: string;
  sourceUrl?: string;
  externalId: string;
  rating?: number;
  reviewCount?: number;
  salesCount?: number;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface DataSourceConfig {
  name: string;
  enabled: boolean;
  priority: number;
  apiKey?: string;
  apiSecret?: string;
  appKey?: string;
  endpoint?: string;
}

interface SearchResult {
  items: ClothingItem[];
  total: number;
  page: number;
  pageSize: number;
  source: string;
}

@Injectable()
export class ClothingDataSourceService {
  private readonly logger = new Logger(ClothingDataSourceService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly sources: Map<string, DataSourceConfig> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'XunO/1.0',
      },
    });

    this.initializeSources();
  }

  private initializeSources(): void {
    const sources = [
      {
        name: 'taobao',
        enabled: !!this.configService.get('TAOBAO_APP_KEY'),
        priority: 1,
        apiKey: this.configService.get('TAOBAO_APP_KEY'),
        apiSecret: this.configService.get('TAOBAO_APP_SECRET'),
        endpoint: 'https://eco.taobao.com/router/rest',
      },
      {
        name: 'jd',
        enabled: !!this.configService.get('JD_APP_KEY'),
        priority: 2,
        apiKey: this.configService.get('JD_APP_KEY'),
        apiSecret: this.configService.get('JD_APP_SECRET'),
        endpoint: 'https://api.jd.com/routerjson',
      },
      {
        name: 'dewu',
        enabled: !!this.configService.get('DEWU_APP_KEY'),
        priority: 3,
        apiKey: this.configService.get('DEWU_APP_KEY'),
        apiSecret: this.configService.get('DEWU_APP_SECRET'),
        endpoint: 'https://openapi.dewu.com',
      },
      {
        name: 'api4ai',
        enabled: !!this.configService.get('API4AI_KEY'),
        priority: 4,
        apiKey: this.configService.get('API4AI_KEY'),
        endpoint: 'https://api.api4ai.cloud/fashion/v2/results',
      },
    ];

    for (const source of sources) {
      this.sources.set(source.name, source);
    }

    this.logger.log(`Initialized ${this.sources.size} data sources: ${Array.from(this.sources.keys()).join(', ')}`);
  }

  async searchClothing(
    query: string,
    options: {
      category?: string;
      minPrice?: number;
      maxPrice?: number;
      brand?: string;
      page?: number;
      pageSize?: number;
      sources?: string[];
    } = {}
  ): Promise<SearchResult[]> {
    const { page = 1, pageSize = 20, sources: requestedSources } = options;
    const enabledSources = Array.from(this.sources.values())
      .filter((s) => s.enabled)
      .filter((s) => !requestedSources || requestedSources.includes(s.name))
      .sort((a, b) => a.priority - b.priority);

    const results: SearchResult[] = [];

    for (const source of enabledSources) {
      try {
        const result = await this.searchFromSource(source.name, query, options);
        results.push(result);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Failed to search from ${source.name}: ${errorMessage}`);
      }
    }

    return results;
  }

  private async searchFromSource(
    sourceName: string,
    query: string,
    options: Record<string, unknown>
  ): Promise<SearchResult> {
    switch (sourceName) {
      case 'taobao':
        return this.searchFromTaobao(query, options);
      case 'jd':
        return this.searchFromJD(query, options);
      case 'dewu':
        return this.searchFromDewu(query, options);
      case 'api4ai':
        return this.searchFromApi4Ai(query, options);
      default:
        throw new Error(`Unknown source: ${sourceName}`);
    }
  }

  private async searchFromTaobao(
    query: string,
    options: Record<string, unknown>
  ): Promise<SearchResult> {
    const config = this.sources.get('taobao');
    if (!config?.apiKey || !config?.apiSecret) {
      throw new Error('Taobao API credentials not configured');
    }

    const params: Record<string, string | number> = {
      method: 'taobao.tbk.item.search',
      app_key: config.apiKey,
      timestamp: new Date().toISOString().replace(/\.\d{3}/, ''),
      format: 'json',
      v: '2.0',
      sign_method: 'md5',
      q: query,
      page_no: (options.page as number) || 1,
      page_size: (options.pageSize as number) || 20,
    };

    if (options.category) {
      params.cat = options.category as string;
    }
    if (options.minPrice) {
      params.start_price = options.minPrice as number;
    }
    if (options.maxPrice) {
      params.end_price = options.maxPrice as number;
    }

    const sign = this.generateTaobaoSign(params, config.apiSecret);
    params.sign = sign;

    try {
      const response = await this.axiosInstance.get(config.endpoint!, { params });
      const data = response.data;

      if (data.error_response) {
        throw new Error(data.error_response.msg || 'Taobao API error');
      }

      const items = (data.tbk_item_search_get_response?.results?.n_tbk_item || []).map(
        (item: Record<string, unknown>) => this.normalizeTaobaoItem(item)
      );

      return {
        items,
        total: data.tbk_item_search_get_response?.total_results || 0,
        page: (options.page as number) || 1,
        pageSize: (options.pageSize as number) || 20,
        source: 'taobao',
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Taobao search error: ${errorMessage}`);
      throw error;
    }
  }

  private generateTaobaoSign(
    params: Record<string, string | number>,
    secret: string
  ): string {
    const sortedKeys = Object.keys(params).sort();
    const signString = sortedKeys.map((key) => `${key}${params[key]}`).join('');
    return crypto.createHash('md5').update(secret + signString + secret).digest('hex').toUpperCase();
  }

  private normalizeTaobaoItem(item: Record<string, unknown>): ClothingItem {
    return {
      id: `tb_${item.num_iid}`,
      externalId: String(item.num_iid || ''),
      name: String(item.title || ''),
      brand: String(item.brand_name || ''),
      price: parseFloat(String(item.reserve_price || item.zk_final_price || 0)),
      originalPrice: parseFloat(String(item.reserve_price || 0)),
      currency: 'CNY',
      images: String(item.pict_url || '').split(',').filter(Boolean),
      mainImage: String(item.pict_url || '').split(',')[0] || '',
      category: String(item.cat_name || ''),
      description: String(item.title || ''),
      source: 'taobao',
      sourceUrl: String(item.item_url || ''),
      rating: parseFloat(String(item.tk_rate || 0)),
      salesCount: parseInt(String(item.volume || 0), 10),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private async searchFromJD(
    query: string,
    options: Record<string, unknown>
  ): Promise<SearchResult> {
    const config = this.sources.get('jd');
    if (!config?.apiKey || !config?.apiSecret) {
      throw new Error('JD API credentials not configured');
    }

    const params: Record<string, string | number> = {
      method: 'jd.union.open.goods.jingfen.query',
      app_key: config.apiKey,
      timestamp: Date.now(),
      format: 'json',
      v: '1.0',
      sign_method: 'md5',
      'goodsReq.keyword': query,
      'goodsReq.pageIndex': (options.page as number) || 1,
      'goodsReq.pageSize': (options.pageSize as number) || 20,
    };

    const sign = this.generateJDSign(params, config.apiSecret);
    params.sign = sign;

    try {
      const response = await this.axiosInstance.get(config.endpoint!, { params });
      const data = response.data;

      const items = (data.result?.data || []).map((item: Record<string, unknown>) =>
        this.normalizeJDItem(item)
      );

      return {
        items,
        total: data.result?.totalCount || 0,
        page: (options.page as number) || 1,
        pageSize: (options.pageSize as number) || 20,
        source: 'jd',
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`JD search error: ${errorMessage}`);
      throw error;
    }
  }

  private generateJDSign(
    params: Record<string, string | number>,
    secret: string
  ): string {
    const sortedKeys = Object.keys(params).sort();
    const signString = sortedKeys.map((key) => `${key}${params[key]}`).join('');
    return crypto.createHash('md5').update(secret + signString + secret).digest('hex').toUpperCase();
  }

  private normalizeJDItem(item: JDItem): ClothingItem {
    return {
      id: `jd_${item.skuId}`,
      externalId: String(item.skuId || ''),
      name: String(item.skuName || ''),
      brand: String(item.brandName || ''),
      price: parseFloat(String(item.price || 0)),
      originalPrice: parseFloat(String(item.originalPrice || 0)),
      currency: 'CNY',
      images: String(item.imageInfo?.imageList || '')
        .split(',')
        .filter(Boolean),
      mainImage: String(item.imageInfo?.whiteImage || item.imageInfo?.imageList || '').split(',')[0] || '',
      category: String(item.categoryInfo?.cid1Name || ''),
      subcategory: String(item.categoryInfo?.cid2Name || ''),
      description: String(item.skuName || ''),
      source: 'jd',
      sourceUrl: String(item.materialUrl || ''),
      rating: parseFloat(String(item.goodCommentsShare || 0)),
      salesCount: parseInt(String(item.inOrderCount30Days || 0), 10),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private async searchFromDewu(
    query: string,
    options: Record<string, unknown>
  ): Promise<SearchResult> {
    const config = this.sources.get('dewu');
    if (!config?.apiKey || !config?.apiSecret) {
      throw new Error('Dewu API credentials not configured');
    }

    const timestamp = Date.now().toString();
    const params = {
      keyword: query,
      page: (options.page as number) || 1,
      size: (options.pageSize as number) || 20,
    };

    const sign = this.generateDewuSign(params, config.apiSecret, timestamp);

    try {
      const response = await this.axiosInstance.get(`${config.endpoint}/v1/h5/search`, {
        headers: {
          'X-App-Key': config.apiKey,
          'X-Timestamp': timestamp,
          'X-Sign': sign,
        },
        params,
      });

      const data = response.data;
      const items = (data.data?.list || []).map((item: Record<string, unknown>) =>
        this.normalizeDewuItem(item)
      );

      return {
        items,
        total: data.data?.total || 0,
        page: (options.page as number) || 1,
        pageSize: (options.pageSize as number) || 20,
        source: 'dewu',
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Dewu search error: ${errorMessage}`);
      throw error;
    }
  }

  private generateDewuSign(
    params: Record<string, unknown>,
    secret: string,
    timestamp: string
  ): string {
    const paramString = JSON.stringify(params);
    const signString = `${secret}${timestamp}${paramString}`;
    return crypto.createHash('sha256').update(signString).digest('hex');
  }

  private normalizeDewuItem(item: Record<string, unknown>): ClothingItem {
    return {
      id: `dw_${item.productId}`,
      externalId: String(item.productId || ''),
      name: String(item.title || ''),
      brand: String(item.brandName || ''),
      price: parseFloat(String(item.price || 0)),
      originalPrice: parseFloat(String(item.originalPrice || item.price || 0)),
      currency: 'CNY',
      images: String(item.images || '').split(',').filter(Boolean),
      mainImage: String(item.coverImage || '').split(',')[0] || '',
      category: String(item.categoryName || ''),
      description: String(item.title || ''),
      source: 'dewu',
      sourceUrl: `https://www.dewu.com/product/${item.productId}`,
      rating: parseFloat(String(item.rating || 0)),
      salesCount: parseInt(String(item.salesCount || 0), 10),
      tags: String(item.tags || '').split(',').filter(Boolean),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private async searchFromApi4Ai(
    query: string,
    options: Record<string, unknown>
  ): Promise<SearchResult> {
    const config = this.sources.get('api4ai');
    if (!config?.apiKey) {
      throw new Error('API4AI credentials not configured');
    }

    return {
      items: [],
      total: 0,
      page: (options.page as number) || 1,
      pageSize: (options.pageSize as number) || 20,
      source: 'api4ai',
    };
  }

  async getItemById(source: string, externalId: string): Promise<ClothingItem | null> {
    switch (source) {
      case 'taobao':
        return this.getTaobaoItem(externalId);
      case 'jd':
        return this.getJDItem(externalId);
      case 'dewu':
        return this.getDewuItem(externalId);
      default:
        throw new Error(`Unknown source: ${source}`);
    }
  }

  private async getTaobaoItem(itemId: string): Promise<ClothingItem | null> {
    const config = this.sources.get('taobao');
    if (!config?.apiKey || !config?.apiSecret) {
      return null;
    }

    const params: Record<string, string | number> = {
      method: 'taobao.tbk.item.info.get',
      app_key: config.apiKey,
      timestamp: new Date().toISOString().replace(/\.\d{3}/, ''),
      format: 'json',
      v: '2.0',
      sign_method: 'md5',
      num_iids: itemId,
    };

    const sign = this.generateTaobaoSign(params, config.apiSecret);
    params.sign = sign;

    try {
      const response = await this.axiosInstance.get(config.endpoint!, { params });
      const data = response.data;

      if (data.tbk_item_info_get_response?.results?.n_tbk_item?.[0]) {
        return this.normalizeTaobaoItem(data.tbk_item_info_get_response.results.n_tbk_item[0]);
      }
      return null;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Taobao get item error: ${errorMessage}`);
      return null;
    }
  }

  private async getJDItem(skuId: string): Promise<ClothingItem | null> {
    const config = this.sources.get('jd');
    if (!config?.apiKey || !config?.apiSecret) {
      return null;
    }

    const params: Record<string, string | number> = {
      method: 'jd.union.open.goods.promotiongoodsinfo.query',
      app_key: config.apiKey,
      timestamp: Date.now(),
      format: 'json',
      v: '1.0',
      sign_method: 'md5',
      skuIds: skuId,
    };

    const sign = this.generateJDSign(params, config.apiSecret);
    params.sign = sign;

    try {
      const response = await this.axiosInstance.get(config.endpoint!, { params });
      const data = response.data;

      if (data.result?.data?.[0]) {
        return this.normalizeJDItem(data.result.data[0]);
      }
      return null;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`JD get item error: ${errorMessage}`);
      return null;
    }
  }

  private async getDewuItem(productId: string): Promise<ClothingItem | null> {
    const config = this.sources.get('dewu');
    if (!config?.apiKey || !config?.apiSecret) {
      return null;
    }

    const timestamp = Date.now().toString();
    const sign = this.generateDewuSign({ productId }, config.apiSecret, timestamp);

    try {
      const response = await this.axiosInstance.get(`${config.endpoint}/v1/h5/product/detail`, {
        headers: {
          'X-App-Key': config.apiKey,
          'X-Timestamp': timestamp,
          'X-Sign': sign,
        },
        params: { productId },
      });

      if (response.data?.data) {
        return this.normalizeDewuItem(response.data.data);
      }
      return null;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Dewu get item error: ${errorMessage}`);
      return null;
    }
  }

  getAvailableSources(): string[] {
    return Array.from(this.sources.values())
      .filter((s) => s.enabled)
      .map((s) => s.name);
  }

  getSourceStatus(): Record<string, { enabled: boolean; priority: number }> {
    const status: Record<string, { enabled: boolean; priority: number }> = {};
    for (const [name, config] of this.sources) {
      status[name] = {
        enabled: config.enabled,
        priority: config.priority,
      };
    }
    return status;
  }
}
