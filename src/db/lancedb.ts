import { connect, Connection, Table } from '@lancedb/lancedb'
import { v4 as uuidv4 } from 'uuid'
import { config } from '../config'
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

// Helper function to convert query results to array
async function queryToArray<T>(query: any): Promise<T[]> {
  const results: T[] = []
  for await (const batch of query) {
    results.push(...batch.toArray() as T[])
  }
  return results
}

export class LanceDBClient implements VectorDB {
  private connection: Connection | null = null
  private projectsTable: Table | null = null
  private memoriesTable: Table | null = null
  private knowledgeBasesTable: Table | null = null
  private factsTable: Table | null = null
  private chatSessionsTable: Table | null = null
  private chatMessagesTable: Table | null = null
  
  async getConnection(): Promise<Connection> {
    if (!this.connection) {
      this.connection = await connect(config.lancedbPath)
    }
    return this.connection
  }
  
  async getProjectsTable(): Promise<Table> {
    if (!this.projectsTable) {
      const conn = await this.getConnection()
      const tables = await conn.tableNames()
      
      if (!tables.includes('projects')) {
        this.projectsTable = await conn.createTable('projects', [{
          project_id: uuidv4(),
          user_id: 'dummy',
          name: 'dummy',
          description: '',
          metadata: {},
          created_at: new Date(),
          updated_at: new Date(),
        }])
        // Clear dummy data
        await this.projectsTable.delete('project_id = "dummy"')
      } else {
        this.projectsTable = await conn.openTable('projects')
      }
    }
    return this.projectsTable
  }
  
  async getMemoriesTable(): Promise<Table> {
    if (!this.memoriesTable) {
      const conn = await this.getConnection()
      const tables = await conn.tableNames()
      
      if (!tables.includes('memories')) {
        this.memoriesTable = await conn.createTable('memories', [{
          memory_id: uuidv4(),
          user_id: 'dummy',
          project_id: '',
          content: 'dummy',
          metadata: {},
          importance: 5,
          created_at: new Date(),
          updated_at: new Date(),
          embedding: new Array(config.embeddingDimensions).fill(0),
        }])
        await this.memoriesTable.delete('memory_id = "dummy"')
      } else {
        this.memoriesTable = await conn.openTable('memories')
      }
    }
    return this.memoriesTable
  }
  
  async getKnowledgeBasesTable(): Promise<Table> {
    if (!this.knowledgeBasesTable) {
      const conn = await this.getConnection()
      const tables = await conn.tableNames()
      
      if (!tables.includes('knowledge_bases')) {
        this.knowledgeBasesTable = await conn.createTable('knowledge_bases', [{
          kb_id: uuidv4(),
          project_id: 'dummy',
          name: 'dummy',
          description: '',
          metadata: {},
          created_at: new Date(),
          updated_at: new Date(),
        }])
        await this.knowledgeBasesTable.delete('kb_id = "dummy"')
      } else {
        this.knowledgeBasesTable = await conn.openTable('knowledge_bases')
      }
    }
    return this.knowledgeBasesTable
  }
  
  async getFactsTable(): Promise<Table> {
    if (!this.factsTable) {
      const conn = await this.getConnection()
      const tables = await conn.tableNames()
      
      if (!tables.includes('facts')) {
        this.factsTable = await conn.createTable('facts', [{
          fact_id: uuidv4(),
          kb_id: 'dummy',
          content: 'dummy',
          metadata: {},
          confidence: 1,
          created_at: new Date(),
          updated_at: new Date(),
          embedding: new Array(config.embeddingDimensions).fill(0),
        }])
        await this.factsTable.delete('fact_id = "dummy"')
      } else {
        this.factsTable = await conn.openTable('facts')
      }
    }
    return this.factsTable
  }
  
  async getChatSessionsTable(): Promise<Table> {
    if (!this.chatSessionsTable) {
      const conn = await this.getConnection()
      const tables = await conn.tableNames()
      
      if (!tables.includes('chat_sessions')) {
        this.chatSessionsTable = await conn.createTable('chat_sessions', [{
          session_id: uuidv4(),
          user_id: 'dummy',
          project_id: 'dummy',
          metadata: {},
          created_at: new Date(),
          updated_at: new Date(),
        }])
        await this.chatSessionsTable.delete('session_id = "dummy"')
      } else {
        this.chatSessionsTable = await conn.openTable('chat_sessions')
      }
    }
    return this.chatSessionsTable
  }
  
  async getChatMessagesTable(): Promise<Table> {
    if (!this.chatMessagesTable) {
      const conn = await this.getConnection()
      const tables = await conn.tableNames()
      
      if (!tables.includes('chat_messages')) {
        this.chatMessagesTable = await conn.createTable('chat_messages', [{
          message_id: uuidv4(),
          session_id: 'dummy',
          role: 'user',
          content: 'dummy',
          metadata: {},
          created_at: new Date(),
          embedding: new Array(config.embeddingDimensions).fill(0),
        }])
        await this.chatMessagesTable.delete('message_id = "dummy"')
      } else {
        this.chatMessagesTable = await conn.openTable('chat_messages')
      }
    }
    return this.chatMessagesTable
  }
  
  // Project operations
  async createProject(project: Omit<Project, 'project_id' | 'created_at' | 'updated_at'>): Promise<Project> {
    const table = await this.getProjectsTable()
    const newProject: Project = {
      ...project,
      project_id: uuidv4(),
      created_at: new Date(),
      updated_at: new Date(),
    }
    await table.add([newProject])
    return newProject
  }
  
  async getProject(projectId: string): Promise<Project | null> {
    const table = await this.getProjectsTable()
    const query = table.query().where(`project_id = "${projectId}"`).limit(1)
    const results = await queryToArray<Project>(query)
    return results.length > 0 ? results[0] : null
  }
  
  async getUserProjects(userId: string): Promise<Project[]> {
    const table = await this.getProjectsTable()
    const query = table.query().where(`user_id = "${userId}"`)
    return queryToArray<Project>(query)
  }
  
  async deleteProject(projectId: string): Promise<boolean> {
    const table = await this.getProjectsTable()
    await table.delete(`project_id = "${projectId}"`)
    return true
  }
  
  // Memory operations
  async createMemory(memory: Omit<Memory, 'memory_id' | 'created_at' | 'updated_at'>): Promise<Memory> {
    const table = await this.getMemoriesTable()
    const newMemory: Memory = {
      ...memory,
      memory_id: uuidv4(),
      created_at: new Date(),
      updated_at: new Date(),
    }
    await table.add([newMemory])
    return newMemory
  }
  
  async getMemory(memoryId: string): Promise<Memory | null> {
    const table = await this.getMemoriesTable()
    const query = table.query().where(`memory_id = "${memoryId}"`).limit(1)
    const results = await queryToArray<Memory>(query)
    return results.length > 0 ? results[0] : null
  }
  
  async getUserMemories(userId: string, projectId?: string, limit = 100, offset = 0): Promise<Memory[]> {
    const table = await this.getMemoriesTable()
    let query = table.query().where(`user_id = "${userId}"`)
    
    if (projectId) {
      query = query.where(`project_id = "${projectId}"`)
    }
    
    const limitedQuery = query.limit(limit + offset)
    const results = await queryToArray<Memory>(limitedQuery)
    // Note: LanceDB doesn't have native offset support, so we'll slice the results
    return results.slice(offset, offset + limit)
  }
  
  async searchMemories(
    userId: string,
    _query: string,
    embedding: number[],
    projectId?: string,
    limit = 10
  ): Promise<MemoryWithScore[]> {
    const table = await this.getMemoriesTable()
    
    // Perform vector search with filters
    const query = table.vectorSearch(embedding)
      .where(`user_id = "${userId}"${projectId ? ` AND project_id = "${projectId}"` : ''}`)
      .limit(limit)
    
    const results = await queryToArray<any>(query)
    
    return results.map(r => ({
      ...r,
      similarity_score: 1 - (r._distance || 0), // Convert distance to similarity
    })) as MemoryWithScore[]
  }
  
  async deleteMemory(memoryId: string): Promise<boolean> {
    const table = await this.getMemoriesTable()
    await table.delete(`memory_id = "${memoryId}"`)
    return true
  }
  
  async deleteUserMemories(userId: string, projectId?: string): Promise<number> {
    const table = await this.getMemoriesTable()
    let whereClause = `user_id = "${userId}"`
    
    if (projectId) {
      whereClause += ` AND project_id = "${projectId}"`
    }
    
    // Count before delete
    const query = table.query().where(whereClause)
    const toDelete = await queryToArray<Memory>(query)
    await table.delete(whereClause)
    return toDelete.length
  }
  
  // Knowledge base operations
  async createKnowledgeBase(kb: Omit<KnowledgeBase, 'kb_id' | 'created_at' | 'updated_at'>): Promise<KnowledgeBase> {
    const table = await this.getKnowledgeBasesTable()
    const newKb: KnowledgeBase = {
      ...kb,
      kb_id: uuidv4(),
      created_at: new Date(),
      updated_at: new Date(),
    }
    await table.add([newKb])
    return newKb
  }
  
  async getKnowledgeBase(kbId: string): Promise<KnowledgeBase | null> {
    const table = await this.getKnowledgeBasesTable()
    const query = table.query().where(`kb_id = "${kbId}"`).limit(1)
    const results = await queryToArray<KnowledgeBase>(query)
    return results.length > 0 ? results[0] : null
  }
  
  async getProjectKnowledgeBases(projectId: string): Promise<KnowledgeBase[]> {
    const table = await this.getKnowledgeBasesTable()
    const query = table.query().where(`project_id = "${projectId}"`)
    return queryToArray<KnowledgeBase>(query)
  }
  
  async deleteKnowledgeBase(kbId: string): Promise<boolean> {
    const table = await this.getKnowledgeBasesTable()
    await table.delete(`kb_id = "${kbId}"`)
    return true
  }
  
  // Fact operations
  async createFact(fact: Omit<Fact, 'fact_id' | 'created_at' | 'updated_at'>): Promise<Fact> {
    const table = await this.getFactsTable()
    const newFact: Fact = {
      ...fact,
      fact_id: uuidv4(),
      created_at: new Date(),
      updated_at: new Date(),
    }
    await table.add([newFact])
    return newFact
  }
  
  async getFact(factId: string): Promise<Fact | null> {
    const table = await this.getFactsTable()
    const query = table.query().where(`fact_id = "${factId}"`).limit(1)
    const results = await queryToArray<Fact>(query)
    return results.length > 0 ? results[0] : null
  }
  
  async getKnowledgeBaseFacts(kbId: string, limit = 100, offset = 0): Promise<Fact[]> {
    const table = await this.getFactsTable()
    const query = table.query()
      .where(`kb_id = "${kbId}"`)
      .limit(limit + offset)
    const results = await queryToArray<Fact>(query)
    return results.slice(offset, offset + limit)
  }
  
  async searchFacts(
    kbId: string,
    _query: string,
    embedding: number[],
    limit = 10
  ): Promise<FactWithScore[]> {
    const table = await this.getFactsTable()
    const query = table.vectorSearch(embedding)
      .where(`kb_id = "${kbId}"`)
      .limit(limit)
    
    const results = await queryToArray<any>(query)
    
    return results.map(r => ({
      ...r,
      similarity_score: 1 - (r._distance || 0),
    })) as FactWithScore[]
  }
  
  async deleteFact(factId: string): Promise<boolean> {
    const table = await this.getFactsTable()
    await table.delete(`fact_id = "${factId}"`)
    return true
  }
  
  async deleteKnowledgeBaseFacts(kbId: string): Promise<number> {
    const table = await this.getFactsTable()
    const query = table.query().where(`kb_id = "${kbId}"`)
    const toDelete = await queryToArray<Fact>(query)
    await table.delete(`kb_id = "${kbId}"`)
    return toDelete.length
  }
  
  // Chat operations
  async createChatSession(session: Omit<ChatSession, 'session_id' | 'created_at' | 'updated_at'>): Promise<ChatSession> {
    const table = await this.getChatSessionsTable()
    const newSession: ChatSession = {
      ...session,
      session_id: uuidv4(),
      created_at: new Date(),
      updated_at: new Date(),
    }
    await table.add([newSession])
    return newSession
  }
  
  async getChatSession(sessionId: string): Promise<ChatSession | null> {
    const table = await this.getChatSessionsTable()
    const query = table.query().where(`session_id = "${sessionId}"`).limit(1)
    const results = await queryToArray<ChatSession>(query)
    return results.length > 0 ? results[0] : null
  }
  
  async getUserChatSessions(userId: string, projectId?: string): Promise<ChatSession[]> {
    const table = await this.getChatSessionsTable()
    let whereClause = `user_id = "${userId}"`
    
    if (projectId) {
      whereClause += ` AND project_id = "${projectId}"`
    }
    
    const query = table.query().where(whereClause)
    return queryToArray<ChatSession>(query)
  }
  
  async deleteChatSession(sessionId: string): Promise<boolean> {
    const table = await this.getChatSessionsTable()
    await table.delete(`session_id = "${sessionId}"`)
    return true
  }
  
  // Chat message operations
  async createChatMessage(message: Omit<ChatMessage, 'message_id' | 'created_at'>): Promise<ChatMessage> {
    const table = await this.getChatMessagesTable()
    const newMessage: ChatMessage = {
      ...message,
      message_id: uuidv4(),
      created_at: new Date(),
    }
    await table.add([newMessage])
    return newMessage
  }
  
  async getChatMessage(messageId: string): Promise<ChatMessage | null> {
    const table = await this.getChatMessagesTable()
    const query = table.query().where(`message_id = "${messageId}"`).limit(1)
    const results = await queryToArray<ChatMessage>(query)
    return results.length > 0 ? results[0] : null
  }
  
  async getChatMessages(sessionId: string, limit = 100, offset = 0): Promise<ChatMessage[]> {
    const table = await this.getChatMessagesTable()
    const query = table.query()
      .where(`session_id = "${sessionId}"`)
      .limit(limit + offset)
    const results = await queryToArray<ChatMessage>(query)
    return results.slice(offset, offset + limit)
  }
  
  async searchChatMessages(
    sessionId: string,
    _query: string,
    embedding: number[],
    limit = 10
  ): Promise<ChatMessageWithScore[]> {
    const table = await this.getChatMessagesTable()
    const query = table.vectorSearch(embedding)
      .where(`session_id = "${sessionId}"`)
      .limit(limit)
    
    const results = await queryToArray<any>(query)
    
    return results.map(r => ({
      ...r,
      similarity_score: 1 - (r._distance || 0),
    })) as ChatMessageWithScore[]
  }
  
  async deleteChatMessage(messageId: string): Promise<boolean> {
    const table = await this.getChatMessagesTable()
    await table.delete(`message_id = "${messageId}"`)
    return true
  }
  
  async deleteChatSessionMessages(sessionId: string): Promise<number> {
    const table = await this.getChatMessagesTable()
    const query = table.query().where(`session_id = "${sessionId}"`)
    const toDelete = await queryToArray<ChatMessage>(query)
    await table.delete(`session_id = "${sessionId}"`)
    return toDelete.length
  }
  
  async close(): Promise<void> {
    // LanceDB doesn't require explicit closing
    this.connection = null
    this.projectsTable = null
    this.memoriesTable = null
    this.knowledgeBasesTable = null
    this.factsTable = null
    this.chatSessionsTable = null
    this.chatMessagesTable = null
  }
}