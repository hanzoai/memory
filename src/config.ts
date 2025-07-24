import { config as dotenvConfig } from 'dotenv'
import { z } from 'zod'

// Load environment variables
dotenvConfig()

const ConfigSchema = z.object({
  // Database Backend Settings
  dbBackend: z.enum(['lancedb', 'memory']).default('lancedb'),
  lancedbUri: z.string().default('./data/lancedb'),
  lancedbApiKey: z.string().optional(),
  
  // Embedding Settings
  embeddingModel: z.string().default('Xenova/all-MiniLM-L6-v2'),
  embeddingDimensions: z.number().default(384),
  embeddingProvider: z.enum(['transformers', 'openai', 'mock', 'onnx', 'candle', 'llama']).default('mock'),
  
  // OpenAI Settings (optional)
  openaiApiKey: z.string().optional(),
  openaiModel: z.string().default('gpt-4-turbo-preview'),
  openaiEmbeddingModel: z.string().default('text-embedding-3-small'),
  
  // Server Settings
  host: z.string().default('0.0.0.0'),
  port: z.number().default(8000),
  
  // Feature Flags
  stripPiiDefault: z.boolean().default(false),
  filterWithLlmDefault: z.boolean().default(false),
})

export type Config = z.infer<typeof ConfigSchema>

export function loadConfig(overrides?: Partial<Config>): Config {
  const env = {
    dbBackend: process.env.DB_BACKEND || process.env.HANZO_DB_BACKEND,
    lancedbUri: process.env.LANCEDB_URI || process.env.HANZO_LANCEDB_URI,
    lancedbApiKey: process.env.LANCEDB_API_KEY || process.env.HANZO_LANCEDB_API_KEY,
    embeddingModel: process.env.EMBEDDING_MODEL || process.env.HANZO_EMBEDDING_MODEL,
    embeddingDimensions: (process.env.EMBEDDING_DIMENSIONS || process.env.HANZO_EMBEDDING_DIMENSIONS) ? parseInt(process.env.EMBEDDING_DIMENSIONS || process.env.HANZO_EMBEDDING_DIMENSIONS || '') : undefined,
    embeddingProvider: process.env.EMBEDDING_PROVIDER || process.env.HANZO_EMBEDDING_PROVIDER,
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL,
    openaiEmbeddingModel: process.env.OPENAI_EMBEDDING_MODEL,
    host: process.env.HOST || process.env.HANZO_HOST,
    port: (process.env.PORT || process.env.HANZO_PORT) ? parseInt(process.env.PORT || process.env.HANZO_PORT || '') : undefined,
    stripPiiDefault: (process.env.STRIP_PII_DEFAULT || process.env.HANZO_STRIP_PII_DEFAULT) === 'true',
    filterWithLlmDefault: (process.env.FILTER_WITH_LLM_DEFAULT || process.env.HANZO_FILTER_WITH_LLM_DEFAULT) === 'true',
  }
  
  // Remove undefined values
  const cleanEnv = Object.fromEntries(
    Object.entries(env).filter(([_, v]) => v !== undefined)
  )
  
  return ConfigSchema.parse({ ...cleanEnv, ...overrides })
}

// Global config instance
export const config = loadConfig()