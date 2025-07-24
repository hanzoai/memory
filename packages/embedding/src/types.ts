export interface EmbeddingOptions {
  /** Model name or path */
  model?: string
  /** Embedding dimension */
  dimension?: number
  /** Maximum batch size */
  maxBatchSize?: number
  /** Timeout in milliseconds */
  timeout?: number
  /** API key for cloud providers */
  apiKey?: string
  /** Additional provider-specific options */
  providerOptions?: Record<string, any>
}

export interface EmbeddingResult {
  /** The embedding vector */
  embedding: number[]
  /** Time taken in milliseconds */
  latency?: number
  /** Model used */
  model?: string
  /** Token count if available */
  tokens?: number
}

export interface BatchEmbeddingResult {
  /** Array of embedding vectors */
  embeddings: number[][]
  /** Total time taken in milliseconds */
  latency?: number
  /** Model used */
  model?: string
  /** Total token count if available */
  totalTokens?: number
}

export type EmbeddingProvider = 
  | 'mock'
  | 'openai'
  | 'cohere'
  | 'huggingface'
  | 'transformers'
  | 'onnx'
  | 'candle'
  | 'llama'
  | 'sentence-transformers'
  | 'instructor'

export interface EmbeddingConfig {
  provider: EmbeddingProvider
  options?: EmbeddingOptions
}

export interface EmbeddingMetrics {
  /** Average latency per embedding */
  avgLatency: number
  /** Throughput in embeddings per second */
  throughput: number
  /** Total embeddings processed */
  totalEmbeddings: number
  /** Cache hit rate if caching is enabled */
  cacheHitRate?: number
}