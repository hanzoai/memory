import { getDB } from './db'
import { MemoryService } from './services/memory'

// Lazy load embedding service to avoid loading transformers when not needed
let _getEmbeddingService: any = null
async function getEmbeddingServiceLazy() {
  if (!_getEmbeddingService) {
    const module = await import('./services/embeddings')
    _getEmbeddingService = module.getEmbeddingService
  }
  return _getEmbeddingService()
}
import type {
  RememberRequest,
  SearchRequest,
  Memory,
  MemoryWithScore,
  Project,
  CreateProjectRequest,
  KnowledgeBase,
  CreateKnowledgeBaseRequest,
  Fact,
  AddFactRequest,
  SearchFactsRequest,
  FactWithScore,
  ChatSession,
  CreateChatSessionRequest,
  ChatMessage,
  AddChatMessageRequest,
  SearchChatMessagesRequest,
  ChatMessageWithScore,
} from './models'

export class MemoryClient {
  private memoryService: MemoryService
  
  constructor() {
    this.memoryService = new MemoryService()
  }
  
  // Memory operations
  async remember(request: RememberRequest): Promise<Memory> {
    return this.memoryService.remember(request)
  }
  
  async search(request: SearchRequest): Promise<MemoryWithScore[]> {
    return this.memoryService.search(request)
  }
  
  async getMemory(userId: string, memoryId: string): Promise<Memory | null> {
    return this.memoryService.getMemory(userId, memoryId)
  }
  
  async deleteMemory(userId: string, memoryId: string): Promise<boolean> {
    return this.memoryService.deleteMemory(userId, memoryId)
  }
  
  async deleteUserMemories(userId: string): Promise<number> {
    return this.memoryService.deleteUserMemories(userId)
  }
  
  // Project operations
  async createProject(request: CreateProjectRequest): Promise<Project> {
    const db = await getDB()
    return db.createProject({
      user_id: request.userId,
      name: request.name,
      description: request.description,
      metadata: request.metadata,
    })
  }
  
  async getProject(projectId: string): Promise<Project | null> {
    const db = await getDB()
    return db.getProject(projectId)
  }
  
  async getUserProjects(userId: string): Promise<Project[]> {
    const db = await getDB()
    return db.getUserProjects(userId)
  }
  
  async deleteProject(projectId: string): Promise<boolean> {
    const db = await getDB()
    return db.deleteProject(projectId)
  }
  
  // Knowledge base operations
  async createKnowledgeBase(request: CreateKnowledgeBaseRequest): Promise<KnowledgeBase> {
    const db = await getDB()
    return db.createKnowledgeBase({
      project_id: request.projectId,
      name: request.name,
      description: request.description,
      metadata: request.metadata,
    })
  }
  
  async getKnowledgeBase(kbId: string): Promise<KnowledgeBase | null> {
    const db = await getDB()
    return db.getKnowledgeBase(kbId)
  }
  
  async getProjectKnowledgeBases(projectId: string): Promise<KnowledgeBase[]> {
    const db = await getDB()
    return db.getProjectKnowledgeBases(projectId)
  }
  
  async deleteKnowledgeBase(kbId: string): Promise<boolean> {
    const db = await getDB()
    return db.deleteKnowledgeBase(kbId)
  }
  
  // Fact operations
  async addFact(request: AddFactRequest): Promise<Fact> {
    const db = await getDB()
    const embeddings = await getEmbeddingServiceLazy()
    
    // Generate embedding
    const embedding = await embeddings.embed(request.content)
    
    return db.createFact({
      kb_id: request.knowledgeBaseId,
      content: request.content,
      metadata: request.metadata,
      confidence: request.confidence ?? 1,
      embedding,
    })
  }
  
  async getFact(factId: string): Promise<Fact | null> {
    const db = await getDB()
    return db.getFact(factId)
  }
  
  async getKnowledgeBaseFacts(kbId: string, limit?: number, offset?: number): Promise<Fact[]> {
    const db = await getDB()
    return db.getKnowledgeBaseFacts(kbId, limit, offset)
  }
  
  async searchFacts(request: SearchFactsRequest): Promise<FactWithScore[]> {
    const db = await getDB()
    
    if (!request.query) {
      // Return all facts if no query
      const facts = await db.getKnowledgeBaseFacts(request.knowledgeBaseId, request.limit)
      return facts.map(f => ({ ...f, similarity_score: 1 }))
    }
    
    const embeddings = await getEmbeddingServiceLazy()
    const queryEmbedding = await embeddings.embed(request.query)
    
    return db.searchFacts(
      request.knowledgeBaseId,
      request.query,
      queryEmbedding,
      request.limit
    )
  }
  
  async deleteFact(factId: string): Promise<boolean> {
    const db = await getDB()
    return db.deleteFact(factId)
  }
  
  async deleteKnowledgeBaseFacts(kbId: string): Promise<number> {
    const db = await getDB()
    return db.deleteKnowledgeBaseFacts(kbId)
  }
  
  // Chat operations
  async createChatSession(request: CreateChatSessionRequest): Promise<ChatSession> {
    const db = await getDB()
    return db.createChatSession({
      user_id: request.userId,
      project_id: request.projectId,
      metadata: request.metadata,
    })
  }
  
  async getChatSession(sessionId: string): Promise<ChatSession | null> {
    const db = await getDB()
    return db.getChatSession(sessionId)
  }
  
  async getUserChatSessions(userId: string, projectId?: string): Promise<ChatSession[]> {
    const db = await getDB()
    return db.getUserChatSessions(userId, projectId)
  }
  
  async deleteChatSession(sessionId: string): Promise<boolean> {
    const db = await getDB()
    return db.deleteChatSession(sessionId)
  }
  
  // Chat message operations
  async addChatMessage(request: AddChatMessageRequest): Promise<ChatMessage> {
    const db = await getDB()
    const embeddings = await getEmbeddingServiceLazy()
    
    // Generate embedding
    const embedding = await embeddings.embed(request.content)
    
    return db.createChatMessage({
      session_id: request.sessionId,
      role: request.role,
      content: request.content,
      metadata: request.metadata,
      embedding,
    })
  }
  
  async getChatMessage(messageId: string): Promise<ChatMessage | null> {
    const db = await getDB()
    return db.getChatMessage(messageId)
  }
  
  async getChatMessages(sessionId: string, limit?: number, offset?: number): Promise<ChatMessage[]> {
    const db = await getDB()
    return db.getChatMessages(sessionId, limit, offset)
  }
  
  async searchChatMessages(request: SearchChatMessagesRequest): Promise<ChatMessageWithScore[]> {
    const db = await getDB()
    const embeddings = await getEmbeddingServiceLazy()
    
    const queryEmbedding = await embeddings.embed(request.query)
    
    return db.searchChatMessages(
      request.sessionId,
      request.query,
      queryEmbedding,
      request.limit
    )
  }
  
  async deleteChatMessage(messageId: string): Promise<boolean> {
    const db = await getDB()
    return db.deleteChatMessage(messageId)
  }
  
  async deleteChatSessionMessages(sessionId: string): Promise<number> {
    const db = await getDB()
    return db.deleteChatSessionMessages(sessionId)
  }
  
  // Utility
  async close(): Promise<void> {
    const db = await getDB()
    await db.close()
  }
}