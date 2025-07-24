import type { EmbeddingOptions, EmbeddingResult, BatchEmbeddingResult } from './types'

export abstract class EmbeddingService {
  protected dimension: number
  protected options: EmbeddingOptions
  
  constructor(options: EmbeddingOptions = {}) {
    this.dimension = options.dimension ?? 384
    this.options = options
  }
  
  /**
   * Generate embedding for a single text
   */
  abstract embed(text: string): Promise<EmbeddingResult>
  
  /**
   * Generate embeddings for multiple texts
   */
  abstract embedBatch(texts: string[]): Promise<BatchEmbeddingResult>
  
  /**
   * Get the embedding dimension
   */
  getDimension(): number {
    return this.dimension
  }
  
  /**
   * Check if the service is available/initialized
   */
  abstract isReady(): Promise<boolean>
  
  /**
   * Initialize the service (load models, etc)
   */
  abstract initialize(): Promise<void>
  
  /**
   * Clean up resources
   */
  abstract dispose(): Promise<void>
  
  /**
   * Get service metrics
   */
  getMetrics(): Record<string, any> {
    return {}
  }
}

/**
 * Base class for services that support caching
 */
export abstract class CachedEmbeddingService extends EmbeddingService {
  private cache: Map<string, number[]> = new Map()
  private cacheHits = 0
  private cacheMisses = 0
  
  async embed(text: string): Promise<EmbeddingResult> {
    // Check cache first
    const cached = this.cache.get(text)
    if (cached) {
      this.cacheHits++
      return { embedding: cached }
    }
    
    this.cacheMisses++
    const result = await this.embedUncached(text)
    
    // Cache the result
    this.cache.set(text, result.embedding)
    
    return result
  }
  
  async embedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
    const results: number[][] = []
    const uncachedTexts: string[] = []
    const uncachedIndices: number[] = []
    
    // Check cache for each text
    texts.forEach((text, index) => {
      const cached = this.cache.get(text)
      if (cached) {
        this.cacheHits++
        results[index] = cached
      } else {
        this.cacheMisses++
        uncachedTexts.push(text)
        uncachedIndices.push(index)
      }
    })
    
    // Embed uncached texts
    if (uncachedTexts.length > 0) {
      const uncachedResult = await this.embedBatchUncached(uncachedTexts)
      
      // Cache and insert results
      uncachedResult.embeddings.forEach((embedding, i) => {
        const text = uncachedTexts[i]
        const index = uncachedIndices[i]
        this.cache.set(text, embedding)
        results[index] = embedding
      })
      
      return {
        embeddings: results,
        latency: uncachedResult.latency,
        model: uncachedResult.model,
        totalTokens: uncachedResult.totalTokens,
      }
    }
    
    return { embeddings: results }
  }
  
  /**
   * Embed without caching
   */
  protected abstract embedUncached(text: string): Promise<EmbeddingResult>
  
  /**
   * Batch embed without caching
   */
  protected abstract embedBatchUncached(texts: string[]): Promise<BatchEmbeddingResult>
  
  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear()
    this.cacheHits = 0
    this.cacheMisses = 0
  }
  
  override getMetrics(): Record<string, any> {
    const total = this.cacheHits + this.cacheMisses
    return {
      ...super.getMetrics(),
      cacheSize: this.cache.size,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      cacheHitRate: total > 0 ? this.cacheHits / total : 0,
    }
  }
}