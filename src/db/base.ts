import type {
  Project,
  Memory,
  KnowledgeBase,
  Fact,
  ChatSession,
  ChatMessage,
  MemoryWithScore,
  FactWithScore,
  ChatMessageWithScore,
} from '../models'

export interface VectorDB {
  // Project operations
  createProject(project: Omit<Project, 'project_id' | 'created_at' | 'updated_at'>): Promise<Project>
  getProject(projectId: string): Promise<Project | null>
  getUserProjects(userId: string): Promise<Project[]>
  deleteProject(projectId: string): Promise<boolean>
  
  // Memory operations
  createMemory(memory: Omit<Memory, 'memory_id' | 'created_at' | 'updated_at'>): Promise<Memory>
  getMemory(memoryId: string): Promise<Memory | null>
  getUserMemories(userId: string, projectId?: string, limit?: number, offset?: number): Promise<Memory[]>
  searchMemories(
    userId: string,
    query: string,
    embedding: number[],
    projectId?: string,
    limit?: number
  ): Promise<MemoryWithScore[]>
  deleteMemory(memoryId: string): Promise<boolean>
  deleteUserMemories(userId: string, projectId?: string): Promise<number>
  
  // Knowledge base operations
  createKnowledgeBase(kb: Omit<KnowledgeBase, 'kb_id' | 'created_at' | 'updated_at'>): Promise<KnowledgeBase>
  getKnowledgeBase(kbId: string): Promise<KnowledgeBase | null>
  getProjectKnowledgeBases(projectId: string): Promise<KnowledgeBase[]>
  deleteKnowledgeBase(kbId: string): Promise<boolean>
  
  // Fact operations
  createFact(fact: Omit<Fact, 'fact_id' | 'created_at' | 'updated_at'>): Promise<Fact>
  getFact(factId: string): Promise<Fact | null>
  getKnowledgeBaseFacts(kbId: string, limit?: number, offset?: number): Promise<Fact[]>
  searchFacts(
    kbId: string,
    query: string,
    embedding: number[],
    limit?: number
  ): Promise<FactWithScore[]>
  deleteFact(factId: string): Promise<boolean>
  deleteKnowledgeBaseFacts(kbId: string): Promise<number>
  
  // Chat operations
  createChatSession(session: Omit<ChatSession, 'session_id' | 'created_at' | 'updated_at'>): Promise<ChatSession>
  getChatSession(sessionId: string): Promise<ChatSession | null>
  getUserChatSessions(userId: string, projectId?: string): Promise<ChatSession[]>
  deleteChatSession(sessionId: string): Promise<boolean>
  
  // Chat message operations
  createChatMessage(message: Omit<ChatMessage, 'message_id' | 'created_at'>): Promise<ChatMessage>
  getChatMessage(messageId: string): Promise<ChatMessage | null>
  getChatMessages(sessionId: string, limit?: number, offset?: number): Promise<ChatMessage[]>
  searchChatMessages(
    sessionId: string,
    query: string,
    embedding: number[],
    limit?: number
  ): Promise<ChatMessageWithScore[]>
  deleteChatMessage(messageId: string): Promise<boolean>
  deleteChatSessionMessages(sessionId: string): Promise<number>
  
  // Utility
  close(): Promise<void>
}