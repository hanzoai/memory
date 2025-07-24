import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  TransformersEmbeddingService,
  OpenAIEmbeddingService,
  MockEmbeddingService,
  getEmbeddingService,
  setEmbeddingService,
} from '../../../src/services/embeddings'
import { config } from '../../../src/config'

// Mock transformers
vi.mock('@xenova/transformers', () => ({
  pipeline: vi.fn().mockResolvedValue(
    vi.fn().mockResolvedValue({
      data: new Float32Array([0.1, 0.2, 0.3]),
    })
  ),
  env: {
    allowLocalModels: false,
    useBrowserCache: true,
  },
}))

// Mock OpenAI
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    embeddings: {
      create: vi.fn().mockResolvedValue({
        data: [
          { embedding: [0.1, 0.2, 0.3] },
          { embedding: [0.4, 0.5, 0.6] },
        ],
      }),
    },
  })),
}))

describe('EmbeddingService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  
  describe('TransformersEmbeddingService', () => {
    it('should embed a single text', async () => {
      const service = new TransformersEmbeddingService()
      const embedding = await service.embed('Hello world')
      
      expect(embedding).toHaveLength(3)
      expect(embedding[0]).toBeCloseTo(0.1, 5)
      expect(embedding[1]).toBeCloseTo(0.2, 5)
      expect(embedding[2]).toBeCloseTo(0.3, 5)
    })
    
    it('should embed multiple texts', async () => {
      const service = new TransformersEmbeddingService()
      const embeddings = await service.embedBatch(['Hello', 'World'])
      
      expect(embeddings).toHaveLength(2)
      expect(embeddings[0]).toHaveLength(3)
      expect(embeddings[0][0]).toBeCloseTo(0.1, 5)
      expect(embeddings[0][1]).toBeCloseTo(0.2, 5)
      expect(embeddings[0][2]).toBeCloseTo(0.3, 5)
      expect(embeddings[1]).toHaveLength(3)
      expect(embeddings[1][0]).toBeCloseTo(0.1, 5)
      expect(embeddings[1][1]).toBeCloseTo(0.2, 5)
      expect(embeddings[1][2]).toBeCloseTo(0.3, 5)
    })
    
    it('should use custom model name', async () => {
      const service = new TransformersEmbeddingService('custom-model')
      await service.embed('test')
      
      const { pipeline } = await import('@xenova/transformers')
      expect(pipeline).toHaveBeenCalledWith('feature-extraction', 'custom-model')
    })
    
    it('should cache pipeline instance', async () => {
      const service = new TransformersEmbeddingService()
      await service.embed('test1')
      await service.embed('test2')
      
      const { pipeline } = await import('@xenova/transformers')
      expect(pipeline).toHaveBeenCalledTimes(1)
    })
  })
  
  describe('OpenAIEmbeddingService', () => {
    it('should throw error without API key', () => {
      const originalKey = config.openaiApiKey
      config.openaiApiKey = undefined
      
      expect(() => new OpenAIEmbeddingService()).toThrow('OpenAI API key required')
      
      config.openaiApiKey = originalKey
    })
    
    it('should embed a single text', async () => {
      const service = new OpenAIEmbeddingService('test-key')
      const embedding = await service.embed('Hello world')
      
      expect(embedding).toEqual([0.1, 0.2, 0.3])
    })
    
    it('should embed multiple texts', async () => {
      const service = new OpenAIEmbeddingService('test-key')
      const embeddings = await service.embedBatch(['Hello', 'World'])
      
      expect(embeddings).toHaveLength(2)
      expect(embeddings[0]).toEqual([0.1, 0.2, 0.3])
      expect(embeddings[1]).toEqual([0.4, 0.5, 0.6])
    })
    
    it('should use custom model', async () => {
      const service = new OpenAIEmbeddingService('test-key', 'custom-model')
      await service.embed('test')
      
      const OpenAI = (await import('openai')).default
      const instance = (OpenAI as any).mock.results[0].value
      expect(instance.embeddings.create).toHaveBeenCalledWith({
        model: 'custom-model',
        input: 'test',
      })
    })
  })
  
  describe('getEmbeddingService', () => {
    beforeEach(() => {
      // Reset service
      setEmbeddingService(null as any)
    })
    
    it('should return MockEmbeddingService by default', () => {
      const originalProvider = config.embeddingProvider
      config.embeddingProvider = 'mock'
      
      const service = getEmbeddingService()
      expect(service).toBeInstanceOf(MockEmbeddingService)
      
      config.embeddingProvider = originalProvider
    })
    
    it('should return OpenAIEmbeddingService when configured', () => {
      const originalProvider = config.embeddingProvider
      const originalKey = config.openaiApiKey
      config.embeddingProvider = 'openai'
      config.openaiApiKey = 'test-key'
      
      const service = getEmbeddingService()
      expect(service).toBeInstanceOf(OpenAIEmbeddingService)
      
      config.embeddingProvider = originalProvider
      config.openaiApiKey = originalKey
    })
    
    it('should return cached instance', () => {
      const service1 = getEmbeddingService()
      const service2 = getEmbeddingService()
      expect(service1).toBe(service2)
    })
  })
  
  describe('setEmbeddingService', () => {
    it('should set custom embedding service', () => {
      const customService = new TransformersEmbeddingService('custom')
      setEmbeddingService(customService)
      
      const service = getEmbeddingService()
      expect(service).toBe(customService)
    })
  })
  
  describe('MockEmbeddingService', () => {
    it('should generate deterministic embeddings', async () => {
      const service = new MockEmbeddingService()
      
      const embedding1 = await service.embed('Hello world')
      const embedding2 = await service.embed('Hello world')
      
      expect(embedding1).toHaveLength(384)
      expect(embedding2).toHaveLength(384)
      expect(embedding1).toEqual(embedding2) // Same text = same embedding
    })
    
    it('should generate different embeddings for different text', async () => {
      const service = new MockEmbeddingService()
      
      const embedding1 = await service.embed('Hello')
      const embedding2 = await service.embed('World')
      
      expect(embedding1).not.toEqual(embedding2)
    })
    
    it('should batch embed texts', async () => {
      const service = new MockEmbeddingService()
      const embeddings = await service.embedBatch(['Hello', 'World'])
      
      expect(embeddings).toHaveLength(2)
      expect(embeddings[0]).toHaveLength(384)
      expect(embeddings[1]).toHaveLength(384)
    })
  })
  
  describe('getEmbeddingService with mock', () => {
    beforeEach(() => {
      // Reset service
      setEmbeddingService(null as any)
    })
    
    it('should return MockEmbeddingService when provider is mock', () => {
      const originalProvider = config.embeddingProvider
      config.embeddingProvider = 'mock'
      
      const service = getEmbeddingService()
      expect(service).toBeInstanceOf(MockEmbeddingService)
      
      config.embeddingProvider = originalProvider
    })
    
    it('should default to MockEmbeddingService when no valid provider', () => {
      const originalProvider = config.embeddingProvider
      config.embeddingProvider = 'invalid' as any
      
      const service = getEmbeddingService()
      expect(service).toBeInstanceOf(MockEmbeddingService)
      
      config.embeddingProvider = originalProvider
    })
  })
})