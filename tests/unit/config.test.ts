import { describe, it, expect, beforeEach, vi } from 'vitest'
import { loadConfig } from '../../src/config'

describe('Config', () => {
  beforeEach(() => {
    // Reset environment variables
    vi.resetModules()
    delete process.env.HANZO_DB_BACKEND
    delete process.env.HANZO_LANCEDB_PATH
    delete process.env.HANZO_EMBEDDING_MODEL
    delete process.env.HANZO_EMBEDDING_DIMENSIONS
    delete process.env.HANZO_EMBEDDING_PROVIDER
    delete process.env.OPENAI_API_KEY
    delete process.env.HANZO_HOST
    delete process.env.HANZO_PORT
  })
  
  it('should load default configuration', () => {
    const config = loadConfig()
    
    expect(config.dbBackend).toBe('memory')
    expect(config.lancedbUri).toBe('./data/lancedb')
    expect(config.embeddingModel).toBe('Xenova/all-MiniLM-L6-v2')
    expect(config.embeddingDimensions).toBe(384)
    expect(config.embeddingProvider).toBe('mock')
    expect(config.host).toBe('0.0.0.0')
    expect(config.port).toBe(8000)
    expect(config.stripPiiDefault).toBe(false)
    expect(config.filterWithLlmDefault).toBe(false)
  })
  
  it('should load configuration from environment variables', () => {
    process.env.HANZO_DB_BACKEND = 'memory'
    process.env.HANZO_LANCEDB_URI = '/custom/path'
    process.env.HANZO_EMBEDDING_MODEL = 'custom-model'
    process.env.HANZO_EMBEDDING_DIMENSIONS = '512'
    process.env.HANZO_EMBEDDING_PROVIDER = 'openai'
    process.env.OPENAI_API_KEY = 'test-key'
    process.env.HANZO_HOST = 'localhost'
    process.env.HANZO_PORT = '3000'
    process.env.HANZO_STRIP_PII_DEFAULT = 'true'
    process.env.HANZO_FILTER_WITH_LLM_DEFAULT = 'true'
    
    const config = loadConfig()
    
    expect(config.dbBackend).toBe('memory')
    expect(config.lancedbUri).toBe('/custom/path')
    expect(config.embeddingModel).toBe('custom-model')
    expect(config.embeddingDimensions).toBe(512)
    expect(config.embeddingProvider).toBe('openai')
    expect(config.openaiApiKey).toBe('test-key')
    expect(config.host).toBe('localhost')
    expect(config.port).toBe(3000)
    expect(config.stripPiiDefault).toBe(true)
    expect(config.filterWithLlmDefault).toBe(true)
  })
  
  it('should allow overrides', () => {
    const config = loadConfig({
      dbBackend: 'memory',
      port: 9000,
      embeddingDimensions: 768,
    })
    
    expect(config.dbBackend).toBe('memory')
    expect(config.port).toBe(9000)
    expect(config.embeddingDimensions).toBe(768)
    expect(config.embeddingModel).toBe('Xenova/all-MiniLM-L6-v2') // Default not overridden
  })
  
  it('should validate configuration', () => {
    // Invalid backend
    expect(() => loadConfig({ dbBackend: 'invalid' as any })).toThrow()
    
    // Invalid provider
    expect(() => loadConfig({ embeddingProvider: 'invalid' as any })).toThrow()
  })
})