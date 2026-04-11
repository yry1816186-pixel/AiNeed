export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json_object';
}

export interface ChatResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
  };
  model: string;
}

export interface ChatChunk {
  content: string;
  done: boolean;
}

export interface ImageOptions {
  size?: '1024x768' | '768x1024' | '1024x1024';
  quality?: 'standard' | 'hd';
}

export interface ImageResponse {
  url: string;
  cost: number;
}

export interface ModelInfo {
  name: string;
  provider: string;
  maxTokens: number;
}

export const LLM_PROVIDER_TOKEN = Symbol('ILLMProvider');

export interface ILLMProvider {
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
  chatStream(messages: ChatMessage[], options?: ChatOptions): AsyncIterable<ChatChunk>;
  generateImage(prompt: string, options?: ImageOptions): Promise<ImageResponse>;
  getModelInfo(): ModelInfo;
  healthCheck(): Promise<boolean>;
}
