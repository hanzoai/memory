import { config } from '../config'
import type { VectorDB } from './base'
import { LanceDBClient } from './lancedb'
import { MemoryDB } from './memory'

let dbInstance: VectorDB | null = null

export async function getDB(): Promise<VectorDB> {
  if (!dbInstance) {
    if (config.dbBackend === 'memory') {
      dbInstance = new MemoryDB()
    } else {
      dbInstance = new LanceDBClient()
    }
  }
  return dbInstance
}

export async function closeDB(): Promise<void> {
  if (dbInstance) {
    await dbInstance.close()
    dbInstance = null
  }
}