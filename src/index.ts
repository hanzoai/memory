// Main client export
export { MemoryClient } from './client'

// Configuration
export { loadConfig, config } from './config'
export type { Config } from './config'

// Models
export * from './models'

// Database
export type { VectorDB } from './db'
export { MemoryDB, getDB, closeDB } from './db'
// Note: LanceDBClient is not exported to avoid loading sharp in environments that don't need it

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