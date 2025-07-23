// Main client export
export { MemoryClient } from './client'

// Configuration
export { loadConfig, config } from './config'
export type { Config } from './config'

// Models
export * from './models'

// Database
export type { VectorDB } from './db'
export { LanceDBClient, MemoryDB, getDB, closeDB } from './db'

// Services
export {
  EmbeddingService,
  TransformersEmbeddingService,
  OpenAIEmbeddingService,
  getEmbeddingService,
  setEmbeddingService,
  LLMService,
  OpenAILLMService,
  MockLLMService,
  getLLMService,
  setLLMService,
  MemoryService,
} from './services'

// Server
export { startServer, fastify } from './server'