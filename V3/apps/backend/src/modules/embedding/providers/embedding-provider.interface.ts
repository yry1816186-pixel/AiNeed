export const EMBEDDING_PROVIDER_TOKEN = Symbol('IEmbeddingProvider');

export interface IEmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  getDimensions(): number;
  getModelName(): string;
}
