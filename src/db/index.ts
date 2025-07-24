export type { VectorDB } from './base'
export { MemoryDB } from './memory'
export { getDB, closeDB } from './factory'
// Note: LanceDBClient is not exported to avoid loading sharp in environments that don't need it