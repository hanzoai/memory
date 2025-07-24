import { CachedEmbeddingService } from '../base'
import type { EmbeddingOptions, EmbeddingResult, BatchEmbeddingResult } from '../types'

/**
 * OpenAI embedding service
 */
export class OpenAIEmbeddingService extends CachedEmbeddingService {
  private client: any
  private model: string
  
  constructor(options: EmbeddingOptions = {}) {
    super(options)
    this.model = options.model || 'text-embedding-3-small'
    
    // Adjust dimension based on model
    if (this.model === 'text-embedding-3-small') {
      this.dimension = options.dimension ?? 1536
    } else if (this.model === 'text-embedding-3-large') {
      this.dimension = options.dimension ?? 3072
    } else if (this.model === 'text-embedding-ada-002') {
      this.dimension = 1536
    }
  }
  
  async initialize(): Promise<void> {
    if (!this.options.apiKey) {
      throw new Error('OpenAI API key required')
    }
    
    // Dynamic import to avoid loading if not needed
    const { default: OpenAI } = await import('openai')
    this.client = new OpenAI({
      apiKey: this.options.apiKey,
      timeout: this.options.timeout,
      maxRetries: this.options.providerOptions?.maxRetries ?? 3,
    })
  }
  
  async isReady(): Promise<boolean> {
    return !!this.client
  }
  
  protected async embedUncached(text: string): Promise<EmbeddingResult> {
    const startTime = Date.now()
    
    const response = await this.client.embeddings.create({
      model: this.model,
      input: text,
      dimensions: this.dimension !== 1536 ? this.dimension : undefined, // Only set if non-default
    })
    
    return {
      embedding: response.data[0].embedding,
      latency: Date.now() - startTime,
      model: this.model,
      tokens: response.usage?.total_tokens,
    }
  }
  
  protected async embedBatchUncached(texts: string[]): Promise<BatchEmbeddingResult> {
    const startTime = Date.now()
    
    // OpenAI supports batch embedding natively
    const response = await this.client.embeddings.create({
      model: this.model,
      input: texts,
      dimensions: this.dimension !== 1536 ? this.dimension : undefined,
    })
    
    return {
      embeddings: response.data.map((d: any) => d.embedding),
      latency: Date.now() - startTime,
      model: this.model,
      totalTokens: response.usage?.total_tokens,
    }
  }
  
  async dispose(): Promise<void> {
    this.client = null
    this.clearCache()
  }
}