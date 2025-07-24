import { v4 as uuidv4 } from 'uuid'
import type { VectorDB } from './base'
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

// Simple cosine similarity
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) throw new Error('Vectors must have same length')
  
  let dotProduct = 0
  let normA = 0
  let normB = 0
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

export class MemoryDB implements VectorDB {
  private projects = new Map<string, Project>()
  private memories = new Map<string, Memory>()
  private knowledgeBases = new Map<string, KnowledgeBase>()
  private facts = new Map<string, Fact>()
  private chatSessions = new Map<string, ChatSession>()
  private chatMessages = new Map<string, ChatMessage>()
  
  // Project operations
  async createProject(project: Omit<Project, 'project_id' | 'created_at' | 'updated_at'>): Promise<Project> {
    const newProject: Project = {
      ...project,
      project_id: uuidv4(),
      created_at: new Date(),
      updated_at: new Date(),
    }
    this.projects.set(newProject.project_id, newProject)
    return newProject
  }
  
  async getProject(projectId: string): Promise<Project | null> {
    return this.projects.get(projectId) || null
  }
  
  async getUserProjects(userId: string): Promise<Project[]> {
    return Array.from(this.projects.values()).filter(p => p.user_id === userId)
  }
  
  async deleteProject(projectId: string): Promise<boolean> {
    return this.projects.delete(projectId)
  }
  
  // Memory operations
  async createMemory(memory: Omit<Memory, 'memory_id' | 'created_at' | 'updated_at'>): Promise<Memory> {
    const newMemory: Memory = {
      ...memory,
      memory_id: uuidv4(),
      created_at: new Date(),
      updated_at: new Date(),
    }
    this.memories.set(newMemory.memory_id, newMemory)
    return newMemory
  }
  
  async getMemory(memoryId: string): Promise<Memory | null> {
    return this.memories.get(memoryId) || null
  }
  
  async getUserMemories(userId: string, projectId?: string, limit = 100, offset = 0): Promise<Memory[]> {
    let memories = Array.from(this.memories.values())
      .filter(m => m.user_id === userId)
    
    if (projectId) {
      memories = memories.filter(m => m.project_id === projectId)
    }
    
    return memories.slice(offset, offset + limit)
  }
  
  async searchMemories(
    userId: string,
    _query: string,
    embedding: number[],
    projectId?: string,
    limit = 10
  ): Promise<MemoryWithScore[]> {
    let memories = Array.from(this.memories.values())
      .filter(m => m.user_id === userId && m.embedding)
    
    if (projectId) {
      memories = memories.filter(m => m.project_id === projectId)
    }
    
    const scored = memories.map(m => ({
      ...m,
      similarity_score: cosineSimilarity(embedding, m.embedding!),
    }))
    
    scored.sort((a, b) => b.similarity_score - a.similarity_score)
    
    return scored.slice(0, limit)
  }
  
  async deleteMemory(memoryId: string): Promise<boolean> {
    return this.memories.delete(memoryId)
  }
  
  async deleteUserMemories(userId: string, projectId?: string): Promise<number> {
    let count = 0
    for (const [id, memory] of this.memories) {
      if (memory.user_id === userId && (!projectId || memory.project_id === projectId)) {
        this.memories.delete(id)
        count++
      }
    }
    return count
  }
  
  // Knowledge base operations
  async createKnowledgeBase(kb: Omit<KnowledgeBase, 'kb_id' | 'created_at' | 'updated_at'>): Promise<KnowledgeBase> {
    const newKb: KnowledgeBase = {
      ...kb,
      kb_id: uuidv4(),
      created_at: new Date(),
      updated_at: new Date(),
    }
    this.knowledgeBases.set(newKb.kb_id, newKb)
    return newKb
  }
  
  async getKnowledgeBase(kbId: string): Promise<KnowledgeBase | null> {
    return this.knowledgeBases.get(kbId) || null
  }
  
  async getProjectKnowledgeBases(projectId: string): Promise<KnowledgeBase[]> {
    return Array.from(this.knowledgeBases.values()).filter(kb => kb.project_id === projectId)
  }
  
  async deleteKnowledgeBase(kbId: string): Promise<boolean> {
    return this.knowledgeBases.delete(kbId)
  }
  
  // Fact operations
  async createFact(fact: Omit<Fact, 'fact_id' | 'created_at' | 'updated_at'>): Promise<Fact> {
    const newFact: Fact = {
      ...fact,
      fact_id: uuidv4(),
      created_at: new Date(),
      updated_at: new Date(),
    }
    this.facts.set(newFact.fact_id, newFact)
    return newFact
  }
  
  async getFact(factId: string): Promise<Fact | null> {
    return this.facts.get(factId) || null
  }
  
  async getKnowledgeBaseFacts(kbId: string, limit = 100, offset = 0): Promise<Fact[]> {
    const facts = Array.from(this.facts.values()).filter(f => f.kb_id === kbId)
    return facts.slice(offset, offset + limit)
  }
  
  async searchFacts(
    kbId: string,
    _query: string,
    embedding: number[],
    limit = 10
  ): Promise<FactWithScore[]> {
    const facts = Array.from(this.facts.values())
      .filter(f => f.kb_id === kbId && f.embedding)
    
    const scored = facts.map(f => ({
      ...f,
      similarity_score: cosineSimilarity(embedding, f.embedding!),
    }))
    
    scored.sort((a, b) => b.similarity_score - a.similarity_score)
    
    return scored.slice(0, limit)
  }
  
  async deleteFact(factId: string): Promise<boolean> {
    return this.facts.delete(factId)
  }
  
  async deleteKnowledgeBaseFacts(kbId: string): Promise<number> {
    let count = 0
    for (const [id, fact] of this.facts) {
      if (fact.kb_id === kbId) {
        this.facts.delete(id)
        count++
      }
    }
    return count
  }
  
  // Chat operations
  async createChatSession(session: Omit<ChatSession, 'session_id' | 'created_at' | 'updated_at'>): Promise<ChatSession> {
    const newSession: ChatSession = {
      ...session,
      session_id: uuidv4(),
      created_at: new Date(),
      updated_at: new Date(),
    }
    this.chatSessions.set(newSession.session_id, newSession)
    return newSession
  }
  
  async getChatSession(sessionId: string): Promise<ChatSession | null> {
    return this.chatSessions.get(sessionId) || null
  }
  
  async getUserChatSessions(userId: string, projectId?: string): Promise<ChatSession[]> {
    let sessions = Array.from(this.chatSessions.values()).filter(s => s.user_id === userId)
    
    if (projectId) {
      sessions = sessions.filter(s => s.project_id === projectId)
    }
    
    return sessions
  }
  
  async deleteChatSession(sessionId: string): Promise<boolean> {
    return this.chatSessions.delete(sessionId)
  }
  
  // Chat message operations
  async createChatMessage(message: Omit<ChatMessage, 'message_id' | 'created_at'>): Promise<ChatMessage> {
    const newMessage: ChatMessage = {
      ...message,
      message_id: uuidv4(),
      created_at: new Date(),
    }
    this.chatMessages.set(newMessage.message_id, newMessage)
    return newMessage
  }
  
  async getChatMessage(messageId: string): Promise<ChatMessage | null> {
    return this.chatMessages.get(messageId) || null
  }
  
  async getChatMessages(sessionId: string, limit = 100, offset = 0): Promise<ChatMessage[]> {
    const messages = Array.from(this.chatMessages.values())
      .filter(m => m.session_id === sessionId)
      .sort((a, b) => a.created_at.getTime() - b.created_at.getTime())
    
    return messages.slice(offset, offset + limit)
  }
  
  async searchChatMessages(
    sessionId: string,
    _query: string,
    embedding: number[],
    limit = 10
  ): Promise<ChatMessageWithScore[]> {
    const messages = Array.from(this.chatMessages.values())
      .filter(m => m.session_id === sessionId && m.embedding)
    
    const scored = messages.map(m => ({
      ...m,
      similarity_score: cosineSimilarity(embedding, m.embedding!),
    }))
    
    scored.sort((a, b) => b.similarity_score - a.similarity_score)
    
    return scored.slice(0, limit)
  }
  
  async deleteChatMessage(messageId: string): Promise<boolean> {
    return this.chatMessages.delete(messageId)
  }
  
  async deleteChatSessionMessages(sessionId: string): Promise<number> {
    let count = 0
    for (const [id, message] of this.chatMessages) {
      if (message.session_id === sessionId) {
        this.chatMessages.delete(id)
        count++
      }
    }
    return count
  }
  
  async close(): Promise<void> {
    // Clear all data
    this.projects.clear()
    this.memories.clear()
    this.knowledgeBases.clear()
    this.facts.clear()
    this.chatSessions.clear()
    this.chatMessages.clear()
  }
}