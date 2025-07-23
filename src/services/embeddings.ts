import { pipeline, env } from '@xenova/transformers'
import OpenAI from 'openai'
import { config } from '../config'

// Configure Transformers.js
env.allowLocalModels = false
env.useBrowserCache = true

export abstract class EmbeddingService {
  abstract embed(text: string): Promise<number[]>
  abstract embedBatch(texts: string[]): Promise<number[][]>
}

export class TransformersEmbeddingService extends EmbeddingService {
  private pipeline: any = null
  private modelName: string
  
  constructor(modelName?: string) {
    super()
    this.modelName = modelName || config.embeddingModel
  }
  
  async getPipeline() {
    if (!this.pipeline) {
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
  
  constructor(apiKey?: string, model?: string) {
    super()
    
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

let embeddingService: EmbeddingService | null = null

export function getEmbeddingService(): EmbeddingService {
  if (!embeddingService) {
    if (config.embeddingProvider === 'openai') {
      embeddingService = new OpenAIEmbeddingService()
    } else {
      embeddingService = new TransformersEmbeddingService()
    }
  }
  return embeddingService
}

export function setEmbeddingService(service: EmbeddingService): void {
  embeddingService = service
}