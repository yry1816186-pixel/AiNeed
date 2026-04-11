import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { IEmbeddingProvider } from './embedding-provider.interface';

const EMBEDDING_DIMENSIONS = 1024;

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) & 0xffffffff;
    return (state >>> 0) / 0xffffffff;
  };
}

@Injectable()
export class MockEmbeddingProvider implements IEmbeddingProvider {
  async embed(text: string): Promise<number[]> {
    return this.generateDeterministicVector(text);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return texts.map((text) => this.generateDeterministicVector(text));
  }

  getDimensions(): number {
    return EMBEDDING_DIMENSIONS;
  }

  getModelName(): string {
    return 'mock-embedding';
  }

  private generateDeterministicVector(text: string): number[] {
    const hash = createHash('sha256').update(text).digest();
    const seed = hash.readUInt32BE(0);
    const rng = seededRandom(seed);

    const vector: number[] = [];
    let sumSquares = 0;
    for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) {
      const val = rng() * 2 - 1;
      vector.push(val);
      sumSquares += val * val;
    }

    const magnitude = Math.sqrt(sumSquares);
    return vector.map((val) => val / magnitude);
  }
}
