import { EmbeddingService } from '../base'
import type { EmbeddingOptions, EmbeddingResult, BatchEmbeddingResult } from '../types'

/**
 * Mock embedding service for testing and development
 * Generates deterministic embeddings based on input text
 */
export class MockEmbeddingService extends EmbeddingService {
  private ready = false
  
  async initialize(): Promise<void> {
    this.ready = true
  }
  
  async isReady(): Promise<boolean> {
    return this.ready
  }
  
  async embed(text: string): Promise<EmbeddingResult> {
    const startTime = Date.now()
    
    // Generate deterministic embeddings based on text
    const seed = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const rng = (s: number) => {
      s = Math.sin(s) * 10000
      return s - Math.floor(s)
    }
    
    const embedding = Array.from({ length: this.dimension }, (_, i) => {
      return rng(seed + i) * 2 - 1 // Normalize to [-1, 1]
    })
    
    return {
      embedding,
      latency: Date.now() - startTime,
      model: 'mock',
      tokens: text.split(' ').length,
    }
  }
  
  async embedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
    const startTime = Date.now()
    const results = await Promise.all(texts.map(text => this.embed(text)))
    
    return {
      embeddings: results.map(r => r.embedding),
      latency: Date.now() - startTime,
      model: 'mock',
      totalTokens: results.reduce((sum, r) => sum + (r.tokens || 0), 0),
    }
  }
  
  async dispose(): Promise<void> {
    this.ready = false
  }
}