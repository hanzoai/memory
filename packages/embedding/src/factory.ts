import type { EmbeddingConfig, EmbeddingProvider } from './types'
import { EmbeddingService } from './base'
import {
  MockEmbeddingService,
  OpenAIEmbeddingService,
  CandleEmbeddingService,
  LlamaCppEmbeddingService,
  ONNXEmbeddingService,
  TransformersEmbeddingService,
} from './providers'

/**
 * Factory for creating embedding services
 */
export class EmbeddingFactory {
  private static instances = new Map<string, EmbeddingService>()
  
  /**
   * Create an embedding service
   */
  static async create(config: EmbeddingConfig): Promise<EmbeddingService> {
    const key = `${config.provider}-${JSON.stringify(config.options || {})}`
    
    // Check if we already have an instance
    let service = this.instances.get(key)
    if (service && await service.isReady()) {
      return service
    }
    
    // Create new instance
    service = this.createService(config)
    await service.initialize()
    
    // Cache the instance
    this.instances.set(key, service)
    
    return service
  }
  
  /**
   * Create a service without caching
   */
  static async createNew(config: EmbeddingConfig): Promise<EmbeddingService> {
    const service = this.createService(config)
    await service.initialize()
    return service
  }
  
  private static createService(config: EmbeddingConfig): EmbeddingService {
    const { provider, options = {} } = config
    
    switch (provider) {
      case 'mock':
        return new MockEmbeddingService(options)
        
      case 'openai':
        return new OpenAIEmbeddingService(options)
        
      case 'candle':
        return new CandleEmbeddingService(options)
        
      case 'llama':
        return new LlamaCppEmbeddingService(options)
        
      case 'onnx':
        return new ONNXEmbeddingService(options)
        
      case 'transformers':
        return new TransformersEmbeddingService(options)
        
      default:
        throw new Error(`Unknown embedding provider: ${provider}`)
    }
  }
  
  /**
   * Dispose of all cached instances
   */
  static async disposeAll(): Promise<void> {
    const promises = Array.from(this.instances.values()).map(service => service.dispose())
    await Promise.all(promises)
    this.instances.clear()
  }
  
  /**
   * Get available providers
   */
  static getAvailableProviders(): EmbeddingProvider[] {
    return ['mock', 'openai', 'candle', 'llama', 'onnx', 'transformers']
  }
  
  /**
   * Check if a provider is available
   */
  static async isProviderAvailable(provider: EmbeddingProvider): Promise<boolean> {
    try {
      const service = await this.createNew({ provider })
      const isReady = await service.isReady()
      await service.dispose()
      return isReady
    } catch {
      return false
    }
  }
}