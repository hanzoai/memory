import OpenAI from 'openai'
import { config } from '../config'

export abstract class EmbeddingService {
  abstract embed(text: string): Promise<number[]>
  abstract embedBatch(texts: string[]): Promise<number[][]>
  
  dimension: number
  
  constructor(dimension: number = 384) {
    this.dimension = dimension
  }
}

export class ONNXEmbeddingService extends EmbeddingService {
  private session: any = null
  
  constructor(dimension: number = 384) {
    super(dimension)
  }
  
  async getSession() {
    if (!this.session) {
      // For now, throw an error suggesting to use OpenAI
      // In production, you would download and load the ONNX model here
      throw new Error(
        'ONNX model loading not implemented. Please use EMBEDDING_PROVIDER=openai with an OpenAI API key.'
      )
    }
    return this.session
  }
  
  async embed(_text: string): Promise<number[]> {
    // For now, return a mock embedding
    // In production, this would use the ONNX model
    const dim = 384 // dimension of all-MiniLM-L6-v2
    return Array.from({ length: dim }, () => Math.random() * 2 - 1)
  }
  
  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(text => this.embed(text)))
  }
}

// Legacy transformer service that requires sharp
export class TransformersEmbeddingService extends EmbeddingService {
  private pipeline: any = null
  private modelName: string
  
  constructor(modelName?: string, dimension: number = 384) {
    super(dimension)
    this.modelName = modelName || config.embeddingModel
  }
  
  async getPipeline() {
    if (!this.pipeline) {
      // Dynamic import to avoid loading @xenova/transformers when not needed
      const { pipeline, env } = await import('@xenova/transformers')
      
      // Configure Transformers.js
      env.allowLocalModels = false
      env.useBrowserCache = true
      
      this.pipeline = await pipeline('feature-extraction', this.modelName)
    }
    return this.pipeline
  }
  
  async embed(text: string): Promise<number[]> {
    const pipe = await this.getPipeline()
    const output = await pipe(text, {
      pooling: 'mean',
      normalize: true,
    })
    return Array.from(output.data as Float32Array)
  }
  
  async embedBatch(texts: string[]): Promise<number[][]> {
    // Process in parallel for better performance
    const promises = texts.map(text => this.embed(text))
    return Promise.all(promises)
  }
}

export class OpenAIEmbeddingService extends EmbeddingService {
  private client: OpenAI
  private model: string
  
  constructor(apiKey?: string, model?: string, dimension: number = 1536) {
    super(dimension)
    
    if (!apiKey && !config.openaiApiKey) {
      throw new Error('OpenAI API key required for OpenAI embeddings')
    }
    
    this.client = new OpenAI({
      apiKey: apiKey || config.openaiApiKey,
    })
    
    this.model = model || config.openaiEmbeddingModel
  }
  
  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: text,
    })
    return response.data[0].embedding
  }
  
  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: texts,
    })
    return response.data.map(d => d.embedding)
  }
}

// Mock embedding service for testing
export class MockEmbeddingService extends EmbeddingService {
  constructor(dimension = 384) {
    super(dimension)
  }
  
  async embed(text: string): Promise<number[]> {
    // Generate deterministic embeddings based on text
    const seed = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const rng = (s: number) => {
      s = Math.sin(s) * 10000
      return s - Math.floor(s)
    }
    
    return Array.from({ length: this.dimension }, (_, i) => {
      return rng(seed + i) * 2 - 1
    })
  }
  
  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(text => this.embed(text)))
  }
}

// Re-export specialized embedding services
export { CandleEmbeddingService } from './embeddings/candle'
export { LlamaCppEmbeddingService, LlamaCppBatchEmbeddingService } from './embeddings/llama'

let embeddingService: EmbeddingService | null = null

export async function getEmbeddingService(): Promise<EmbeddingService> {
  if (!embeddingService) {
    switch (config.embeddingProvider) {
      case 'openai':
        embeddingService = new OpenAIEmbeddingService(
          config.openaiApiKey,
          config.openaiEmbeddingModel,
          config.embeddingDimensions
        )
        break
      case 'transformers':
        embeddingService = new TransformersEmbeddingService(
          config.embeddingModel,
          config.embeddingDimensions
        )
        break
      case 'onnx':
        embeddingService = new ONNXEmbeddingService(config.embeddingDimensions)
        break
      case 'candle':
        const { CandleEmbeddingService } = await import('./embeddings/candle')
        embeddingService = new CandleEmbeddingService(
          config.embeddingModel,
          config.embeddingDimensions
        )
        break
      case 'llama':
        const { LlamaCppEmbeddingService } = await import('./embeddings/llama')
        embeddingService = new LlamaCppEmbeddingService(
          config.embeddingModel,
          config.embeddingDimensions
        )
        break
      case 'mock':
      default:
        embeddingService = new MockEmbeddingService(config.embeddingDimensions)
        break
    }
  }
  return embeddingService!
}

export function setEmbeddingService(service: EmbeddingService): void {
  embeddingService = service
}