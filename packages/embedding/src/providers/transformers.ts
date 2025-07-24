import { CachedEmbeddingService } from '../base'
import type { EmbeddingOptions, EmbeddingResult, BatchEmbeddingResult } from '../types'

/**
 * Transformers.js embedding service
 * Uses Xenova/transformers.js for browser and Node.js compatibility
 */
export class TransformersEmbeddingService extends CachedEmbeddingService {
  private pipeline: any = null
  private modelName: string
  
  constructor(options: EmbeddingOptions = {}) {
    super(options)
    this.modelName = options.model || 'Xenova/all-MiniLM-L6-v2'
  }
  
  async initialize(): Promise<void> {
    try {
      // Dynamic import to avoid loading if not needed
      const { pipeline, env } = await import('@xenova/transformers')
      
      // Configure Transformers.js
      env.allowLocalModels = false
      env.useBrowserCache = true
      
      // Load the model
      this.pipeline = await pipeline('feature-extraction', this.modelName, {
        progress_callback: (progress: any) => {
          if (progress.status === 'downloading') {
            console.log(`Downloading ${this.modelName}: ${Math.round(progress.progress)}%`)
          }
        }
      })
    } catch (error) {
      throw new Error(`Failed to initialize Transformers.js model: ${error}`)
    }
  }
  
  async isReady(): Promise<boolean> {
    return !!this.pipeline
  }
  
  protected async embedUncached(text: string): Promise<EmbeddingResult> {
    const startTime = Date.now()
    
    if (!this.pipeline) {
      throw new Error('Pipeline not initialized')
    }
    
    const output = await this.pipeline(text, {
      pooling: 'mean',
      normalize: true,
    })
    
    const embedding = Array.from(output.data as Float32Array)
    
    return {
      embedding,
      latency: Date.now() - startTime,
      model: this.modelName,
    }
  }
  
  protected async embedBatchUncached(texts: string[]): Promise<BatchEmbeddingResult> {
    const startTime = Date.now()
    
    if (!this.pipeline) {
      throw new Error('Pipeline not initialized')
    }
    
    // Process in parallel for better performance
    const outputs = await Promise.all(
      texts.map(text => 
        this.pipeline(text, {
          pooling: 'mean',
          normalize: true,
        })
      )
    )
    
    const embeddings = outputs.map(output => Array.from(output.data as Float32Array))
    
    return {
      embeddings,
      latency: Date.now() - startTime,
      model: this.modelName,
    }
  }
  
  async dispose(): Promise<void> {
    if (this.pipeline) {
      // Dispose of the model to free memory
      await this.pipeline.dispose()
      this.pipeline = null
    }
    this.clearCache()
  }
}