import { getDB } from '../db'
import { getEmbeddingService } from './embeddings'
import { getLLMService } from './llm'
import { config } from '../config'
import type {
  RememberRequest,
  SearchRequest,
  Memory,
  MemoryWithScore,
} from '../models'

export class MemoryService {
  async remember(request: RememberRequest): Promise<Memory> {
    const db = await getDB()
    const embeddings = await getEmbeddingService()
    const llm = getLLMService()
    
    let content = request.content
    
    // Strip PII if requested
    if (request.strip_pii ?? config.stripPiiDefault) {
      content = await llm.stripPII(content)
    }
    
    // Generate embedding
    const embedding = await embeddings.embed(content)
    
    // Create memory
    const memory = await db.createMemory({
      user_id: request.userid,
      project_id: request.projectid,
      content,
      metadata: request.metadata,
      importance: request.importance ?? 5,
      embedding,
    })
    
    return memory
  }
  
  async search(request: SearchRequest): Promise<MemoryWithScore[]> {
    const db = await getDB()
    const embeddings = await getEmbeddingService()
    const llm = getLLMService()
    
    // Generate query embedding
    const queryEmbedding = await embeddings.embed(request.query)
    
    // Search memories
    let results = await db.searchMemories(
      request.userid,
      request.query,
      queryEmbedding,
      request.projectid,
      request.limit ?? 10
    )
    
    // Filter with LLM if requested
    if (request.filter_with_llm ?? config.filterWithLlmDefault) {
      results = await llm.filterResults(
        request.query,
        results,
        request.additional_context
      ) as MemoryWithScore[]
    }
    
    return results
  }
  
  async getMemory(userId: string, memoryId: string): Promise<Memory | null> {
    const db = await getDB()
    const memory = await db.getMemory(memoryId)
    
    // Verify ownership
    if (memory && memory.user_id !== userId) {
      return null
    }
    
    return memory
  }
  
  async deleteMemory(userId: string, memoryId: string): Promise<boolean> {
    const db = await getDB()
    const memory = await db.getMemory(memoryId)
    
    // Verify ownership
    if (!memory || memory.user_id !== userId) {
      return false
    }
    
    return db.deleteMemory(memoryId)
  }
  
  async deleteUserMemories(userId: string): Promise<number> {
    const db = await getDB()
    return db.deleteUserMemories(userId)
  }
}