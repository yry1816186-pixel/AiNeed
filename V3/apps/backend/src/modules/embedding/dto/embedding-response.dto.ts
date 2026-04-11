export class EmbeddingResponseDto {
  vector!: number[];
  dimensions!: number;
  model!: string;
}

export class BatchEmbeddingResponseDto {
  vectors!: number[][];
  count!: number;
  model!: string;
}

export interface SearchResultItem {
  clothingId: string;
  score: number;
  clothing: {
    id: string;
    name: string;
    category?: string | null;
    styleTags: string[];
    colors: string[];
    price?: number | null;
    imageUrls: string[];
  };
}

export class SearchSimilarResponseDto {
  items!: SearchResultItem[];
  total!: number;
}

export class IndexResponseDto {
  clothingId!: string;
  indexed!: boolean;
}

export class BatchIndexResponseDto {
  taskId!: string;
  total!: number;
}
