import { config } from '../src/config'

// Force memory backend for all tests
process.env.DB_BACKEND = 'memory'
config.dbBackend = 'memory'