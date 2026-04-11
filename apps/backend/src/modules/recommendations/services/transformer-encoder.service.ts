import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface TransformerConfig {
  hiddenSize: number;
  numHeads: number;
  numLayers: number;
  dropout: number;
  maxSequenceLength: number;
  feedForwardSize: number;
}

export interface AttentionWeights {
  query: number[][];
  key: number[][];
  value: number[][];
  output: number[][];
}

export interface TransformerLayer {
  attention: MultiHeadAttention;
  feedForward: FeedForwardNetwork;
  layerNorm1: LayerNormalization;
  layerNorm2: LayerNormalization;
}

export interface MultiHeadAttention {
  numHeads: number;
  headDim: number;
  weights: AttentionWeights[];
}

export interface FeedForwardNetwork {
  weights1: number[][];
  bias1: number[];
  weights2: number[][];
  bias2: number[];
}

export interface LayerNormalization {
  gamma: number[];
  beta: number[];
  epsilon: number;
}

@Injectable()
export class TransformerEncoderService {
  private readonly logger = new Logger(TransformerEncoderService.name);
  private readonly config: TransformerConfig;
  private layers: TransformerLayer[] = [];
  private positionEmbeddings: number[][] = [];
  private isInitialized = false;

  constructor(private configService: ConfigService) {
    this.config = {
      hiddenSize: this.configService.get<number>("TRANSFORMER_HIDDEN_SIZE", 64),
      numHeads: this.configService.get<number>("TRANSFORMER_NUM_HEADS", 4),
      numLayers: this.configService.get<number>("TRANSFORMER_NUM_LAYERS", 2),
      dropout: this.configService.get<number>("TRANSFORMER_DROPOUT", 0.1),
      maxSequenceLength: this.configService.get<number>(
        "TRANSFORMER_MAX_SEQ_LEN",
        50,
      ),
      feedForwardSize: this.configService.get<number>(
        "TRANSFORMER_FF_SIZE",
        256,
      ),
    };

    this.initializeTransformer();
  }

  private initializeTransformer(): void {
    this.logger.log("Initializing Transformer encoder...");

    this.positionEmbeddings = this.createPositionEmbeddings(
      this.config.maxSequenceLength,
      this.config.hiddenSize,
    );

    this.layers = [];
    for (let i = 0; i < this.config.numLayers; i++) {
      this.layers.push(this.createTransformerLayer());
    }

    this.isInitialized = true;
    this.logger.log(
      `Transformer initialized: ${this.config.numLayers} layers, ${this.config.numHeads} heads`,
    );
  }

  private createPositionEmbeddings(
    maxLen: number,
    hiddenSize: number,
  ): number[][] {
    const embeddings: number[][] = [];

    for (let pos = 0; pos < maxLen; pos++) {
      const embedding: number[] = new Array(hiddenSize).fill(0);

      for (let i = 0; i < hiddenSize; i++) {
        if (i % 2 === 0) {
          embedding[i] = Math.sin(pos / Math.pow(10000, i / hiddenSize));
        } else {
          embedding[i] = Math.cos(pos / Math.pow(10000, (i - 1) / hiddenSize));
        }
      }

      embeddings.push(embedding);
    }

    return embeddings;
  }

  private createTransformerLayer(): TransformerLayer {
    const headDim = Math.floor(this.config.hiddenSize / this.config.numHeads);

    return {
      attention: {
        numHeads: this.config.numHeads,
        headDim,
        weights: this.initAttentionWeights(),
      },
      feedForward: this.initFeedForward(),
      layerNorm1: this.initLayerNorm(),
      layerNorm2: this.initLayerNorm(),
    };
  }

  private initAttentionWeights(): AttentionWeights[] {
    const weights: AttentionWeights[] = [];
    const hiddenSize = this.config.hiddenSize;
    const headDim = Math.floor(hiddenSize / this.config.numHeads);

    for (let h = 0; h < this.config.numHeads; h++) {
      weights.push({
        query: this.initRandomMatrix(headDim, hiddenSize),
        key: this.initRandomMatrix(headDim, hiddenSize),
        value: this.initRandomMatrix(headDim, hiddenSize),
        output: this.initRandomMatrix(
          hiddenSize,
          headDim * this.config.numHeads,
        ),
      });
    }

    return weights;
  }

  private initFeedForward(): FeedForwardNetwork {
    return {
      weights1: this.initRandomMatrix(
        this.config.feedForwardSize,
        this.config.hiddenSize,
      ),
      bias1: new Array(this.config.feedForwardSize).fill(0),
      weights2: this.initRandomMatrix(
        this.config.hiddenSize,
        this.config.feedForwardSize,
      ),
      bias2: new Array(this.config.hiddenSize).fill(0),
    };
  }

  private initLayerNorm(): LayerNormalization {
    return {
      gamma: new Array(this.config.hiddenSize).fill(1),
      beta: new Array(this.config.hiddenSize).fill(0),
      epsilon: 1e-6,
    };
  }

  private initRandomMatrix(rows: number, cols: number): number[][] {
    const matrix: number[][] = [];
    const scale = Math.sqrt(2.0 / (rows + cols));

    for (let i = 0; i < rows; i++) {
      const row: number[] = [];
      for (let j = 0; j < cols; j++) {
        row.push((Math.random() - 0.5) * 2 * scale);
      }
      matrix.push(row);
    }

    return matrix;
  }

  private createZeroVector(length: number = this.config.hiddenSize): number[] {
    return new Array(length).fill(0);
  }

  private createZeroMatrix(
    rows: number,
    cols: number = this.config.hiddenSize,
  ): number[][] {
    return Array.from({ length: rows }, () => this.createZeroVector(cols));
  }

  encode(sequence: number[][]): number[][] {
    if (!this.isInitialized || sequence.length === 0) {
      return sequence;
    }

    let hiddenStates = this.addPositionEmbeddings(sequence);

    const mask = this.createCausalMask(sequence.length);

    for (const layer of this.layers) {
      hiddenStates = this.applyTransformerLayer(hiddenStates, layer, mask);
    }

    return hiddenStates;
  }

  private addPositionEmbeddings(sequence: number[][]): number[][] {
    return sequence.map((embedding, pos) => {
      const positionEmbedding = this.positionEmbeddings[pos];
      if (positionEmbedding) {
        return this.addVectors(embedding, positionEmbedding);
      }
      return embedding;
    });
  }

  private createCausalMask(seqLen: number): number[][] {
    const mask: number[][] = [];

    for (let i = 0; i < seqLen; i++) {
      const row: number[] = [];
      for (let j = 0; j < seqLen; j++) {
        row.push(j <= i ? 0 : -1e9);
      }
      mask.push(row);
    }

    return mask;
  }

  private applyTransformerLayer(
    input: number[][],
    layer: TransformerLayer,
    mask: number[][],
  ): number[][] {
    const attentionOutput = this.applyMultiHeadAttention(
      input,
      layer.attention,
      mask,
    );

    let output = this.applyLayerNorm(
      this.addMatrices(input, attentionOutput),
      layer.layerNorm1,
    );

    const ffOutput = this.applyFeedForward(output, layer.feedForward);

    output = this.applyLayerNorm(
      this.addMatrices(output, ffOutput),
      layer.layerNorm2,
    );

    return output;
  }

  private applyMultiHeadAttention(
    input: number[][],
    attention: MultiHeadAttention,
    mask: number[][],
  ): number[][] {
    const seqLen = input.length;
    const headOutputs: number[][][] = [];

    for (let h = 0; h < attention.numHeads; h++) {
      const weights = attention.weights[h];
      if (!weights) {
        headOutputs.push(this.createZeroMatrix(seqLen, attention.headDim));
        continue;
      }

      const queries = this.matmul(input, weights.query);
      const keys = this.matmul(input, weights.key);
      const values = this.matmul(input, weights.value);

      const scores = this.computeAttentionScores(
        queries,
        keys,
        attention.headDim,
      );

      const maskedScores = this.applyMask(scores, mask);

      const attentionWeights = this.softmax(maskedScores);

      const headOutput = this.matmul(attentionWeights, values);
      headOutputs.push(headOutput);
    }

    const concatenated = this.concatenateHeads(headOutputs);
    const outputWeights = attention.weights[0]?.output;

    if (!outputWeights || concatenated.length === 0) {
      return this.createZeroMatrix(seqLen, this.config.hiddenSize);
    }

    return this.matmul(concatenated, outputWeights);
  }

  private computeAttentionScores(
    queries: number[][],
    keys: number[][],
    headDim: number,
  ): number[][] {
    const seqLen = queries.length;
    const scores: number[][] = [];
    const scale = Math.sqrt(headDim);

    for (let i = 0; i < seqLen; i++) {
      const row: number[] = [];
      const queryRow = queries[i] ?? [];
      for (let j = 0; j < seqLen; j++) {
        let score = 0;
        const keyRow = keys[j] ?? [];
        const length = Math.min(queryRow.length, keyRow.length);
        for (let k = 0; k < length; k++) {
          score += (queryRow[k] ?? 0) * (keyRow[k] ?? 0);
        }
        row.push(score / scale);
      }
      scores.push(row);
    }

    return scores;
  }

  private applyMask(scores: number[][], mask: number[][]): number[][] {
    return scores.map((row, i) => {
      const maskRow = mask[i] ?? [];
      return row.map((val, j) => val + (maskRow[j] ?? 0));
    });
  }

  private softmax(matrix: number[][]): number[][] {
    return matrix.map((row) => {
      const maxVal = Math.max(...row);
      const expValues = row.map((v) => Math.exp(v - maxVal));
      const sum = expValues.reduce((a, b) => a + b, 0);
      return expValues.map((v) => v / sum);
    });
  }

  private concatenateHeads(heads: number[][][]): number[][] {
    const firstHead = heads[0];
    if (!firstHead) {
      return [];
    }

    const seqLen = firstHead.length;
    const result: number[][] = [];

    for (let i = 0; i < seqLen; i++) {
      const concatenated: number[] = [];
      for (const head of heads) {
        const headRow = head[i];
        if (headRow) {
          concatenated.push(...headRow);
        }
      }
      result.push(concatenated);
    }

    return result;
  }

  private applyFeedForward(
    input: number[][],
    ff: FeedForwardNetwork,
  ): number[][] {
    const hidden = this.matmul(input, ff.weights1).map((row) =>
      row.map((val, i) => this.gelu(val + (ff.bias1[i] ?? 0))),
    );

    return this.matmul(hidden, ff.weights2).map((row) =>
      row.map((val, i) => val + (ff.bias2[i] ?? 0)),
    );
  }

  private gelu(x: number): number {
    return (
      0.5 *
      x *
      (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * Math.pow(x, 3))))
    );
  }

  private applyLayerNorm(
    input: number[][],
    ln: LayerNormalization,
  ): number[][] {
    return input.map((row) => {
      const mean = row.reduce((a, b) => a + b, 0) / row.length;
      const variance =
        row.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / row.length;
      const std = Math.sqrt(variance + ln.epsilon);

      return row.map(
        (val, i) =>
          (ln.gamma[i] ?? 1) * ((val - mean) / std) + (ln.beta[i] ?? 0),
      );
    });
  }

  private matmul(a: number[][], b: number[][]): number[][] {
    const result: number[][] = [];
    const bT = this.transpose(b);

    for (let i = 0; i < a.length; i++) {
      const row: number[] = [];
      const leftRow = a[i] ?? [];
      for (let j = 0; j < bT.length; j++) {
        let sum = 0;
        const rightRow = bT[j] ?? [];
        const length = Math.min(leftRow.length, rightRow.length);
        for (let k = 0; k < length; k++) {
          sum += (leftRow[k] ?? 0) * (rightRow[k] ?? 0);
        }
        row.push(sum);
      }
      result.push(row);
    }

    return result;
  }

  private transpose(matrix: number[][]): number[][] {
    const firstRow = matrix[0];
    if (!firstRow) {return [];}
    const result: number[][] = [];

    for (let j = 0; j < firstRow.length; j++) {
      const column: number[] = [];
      for (let i = 0; i < matrix.length; i++) {
        column.push(matrix[i]?.[j] ?? 0);
      }
      result.push(column);
    }

    return result;
  }

  private addVectors(a: number[], b: number[]): number[] {
    return a.map((val, i) => val + (b[i] ?? 0));
  }

  private addMatrices(a: number[][], b: number[][]): number[][] {
    return a.map((row, i) => this.addVectors(row, b[i] ?? []));
  }

  getLastHiddenState(sequence: number[][]): number[] {
    const encoded = this.encode(sequence);
    const lastState = encoded[encoded.length - 1];
    return lastState ?? this.createZeroVector();
  }

  getSequenceRepresentation(sequence: number[][]): number[] {
    const encoded = this.encode(sequence);
    if (encoded.length === 0) {
      return new Array(this.config.hiddenSize).fill(0);
    }

    const pooled = new Array(this.config.hiddenSize).fill(0);
    for (const state of encoded) {
      for (let i = 0; i < state.length; i++) {
        pooled[i] = (pooled[i] ?? 0) + (state[i] ?? 0);
      }
    }

    return pooled.map((val) => val / encoded.length);
  }

  getConfig(): TransformerConfig {
    return { ...this.config };
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}
