import { vi } from 'vitest'
import { config } from 'dotenv'

// Load test environment variables
config({ path: '.env.test' })

// Set test environment defaults
process.env.HANZO_DB_BACKEND = 'memory'
process.env.HANZO_EMBEDDING_PROVIDER = 'transformers'
process.env.HANZO_STRIP_PII_DEFAULT = 'false'
process.env.HANZO_FILTER_WITH_LLM_DEFAULT = 'false'

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks()
})