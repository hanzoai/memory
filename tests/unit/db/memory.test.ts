import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryDB } from '../../../src/db/memory'
import { v4 as uuidv4 } from 'uuid'
import { generateMockEmbedding } from '../../fixtures'

describe('MemoryDB', () => {
  let db: MemoryDB
  
  beforeEach(() => {
    db = new MemoryDB()
  })
  
  describe('Project operations', () => {
    it('should create a project', async () => {
      const project = await db.createProject({
        user_id: 'user-123',
        name: 'Test Project',
        description: 'A test project',
        metadata: { key: 'value' },
      })
      
      expect(project.project_id).toBeDefined()
      expect(project.user_id).toBe('user-123')
      expect(project.name).toBe('Test Project')
      expect(project.description).toBe('A test project')
      expect(project.metadata).toEqual({ key: 'value' })
      expect(project.created_at).toBeInstanceOf(Date)
      expect(project.updated_at).toBeInstanceOf(Date)
    })
    
    it('should get a project by id', async () => {
      const created = await db.createProject({
        user_id: 'user-123',
        name: 'Test Project',
      })
      
      const project = await db.getProject(created.project_id)
      expect(project).toEqual(created)
    })
    
    it('should return null for non-existent project', async () => {
      const project = await db.getProject('non-existent')
      expect(project).toBeNull()
    })
    
    it('should get user projects', async () => {
      await db.createProject({ user_id: 'user-1', name: 'Project 1' })
      await db.createProject({ user_id: 'user-1', name: 'Project 2' })
      await db.createProject({ user_id: 'user-2', name: 'Project 3' })
      
      const user1Projects = await db.getUserProjects('user-1')
      expect(user1Projects).toHaveLength(2)
      expect(user1Projects[0].user_id).toBe('user-1')
      expect(user1Projects[1].user_id).toBe('user-1')
      
      const user2Projects = await db.getUserProjects('user-2')
      expect(user2Projects).toHaveLength(1)
      expect(user2Projects[0].user_id).toBe('user-2')
    })
    
    it('should delete a project', async () => {
      const project = await db.createProject({
        user_id: 'user-123',
        name: 'Test Project',
      })
      
      const deleted = await db.deleteProject(project.project_id)
      expect(deleted).toBe(true)
      
      const retrieved = await db.getProject(project.project_id)
      expect(retrieved).toBeNull()
    })
  })
  
  describe('Memory operations', () => {
    it('should create a memory', async () => {
      const embedding = generateMockEmbedding()
      const memory = await db.createMemory({
        user_id: 'user-123',
        project_id: 'proj-456',
        content: 'Test memory content',
        metadata: { tags: ['test'] },
        importance: 8,
        embedding,
      })
      
      expect(memory.memory_id).toBeDefined()
      expect(memory.user_id).toBe('user-123')
      expect(memory.project_id).toBe('proj-456')
      expect(memory.content).toBe('Test memory content')
      expect(memory.metadata).toEqual({ tags: ['test'] })
      expect(memory.importance).toBe(8)
      expect(memory.embedding).toEqual(embedding)
    })
    
    it('should get a memory by id', async () => {
      const created = await db.createMemory({
        user_id: 'user-123',
        content: 'Test memory',
        embedding: generateMockEmbedding(),
      })
      
      const memory = await db.getMemory(created.memory_id)
      expect(memory).toEqual(created)
    })
    
    it('should get user memories with pagination', async () => {
      // Create 5 memories
      for (let i = 0; i < 5; i++) {
        await db.createMemory({
          user_id: 'user-123',
          content: `Memory ${i}`,
          embedding: generateMockEmbedding(),
        })
      }
      
      // Get first 3
      const page1 = await db.getUserMemories('user-123', undefined, 3, 0)
      expect(page1).toHaveLength(3)
      
      // Get next 2
      const page2 = await db.getUserMemories('user-123', undefined, 3, 3)
      expect(page2).toHaveLength(2)
    })
    
    it('should filter memories by project', async () => {
      await db.createMemory({
        user_id: 'user-123',
        project_id: 'proj-1',
        content: 'Memory 1',
        embedding: generateMockEmbedding(),
      })
      await db.createMemory({
        user_id: 'user-123',
        project_id: 'proj-2',
        content: 'Memory 2',
        embedding: generateMockEmbedding(),
      })
      
      const proj1Memories = await db.getUserMemories('user-123', 'proj-1')
      expect(proj1Memories).toHaveLength(1)
      expect(proj1Memories[0].project_id).toBe('proj-1')
    })
    
    it('should search memories by similarity', async () => {
      const queryEmbedding = generateMockEmbedding()
      
      // Create memories with different embeddings
      await db.createMemory({
        user_id: 'user-123',
        content: 'Similar memory',
        embedding: queryEmbedding, // Same embedding = highest similarity
      })
      await db.createMemory({
        user_id: 'user-123',
        content: 'Different memory',
        embedding: generateMockEmbedding(), // Different embedding
      })
      
      const results = await db.searchMemories(
        'user-123',
        'query',
        queryEmbedding,
        undefined,
        1
      )
      
      expect(results).toHaveLength(1)
      expect(results[0].content).toBe('Similar memory')
      expect(results[0].similarity_score).toBeCloseTo(1, 10) // Perfect match
    })
    
    it('should delete a memory', async () => {
      const memory = await db.createMemory({
        user_id: 'user-123',
        content: 'Test memory',
        embedding: generateMockEmbedding(),
      })
      
      const deleted = await db.deleteMemory(memory.memory_id)
      expect(deleted).toBe(true)
      
      const retrieved = await db.getMemory(memory.memory_id)
      expect(retrieved).toBeNull()
    })
    
    it('should delete all user memories', async () => {
      // Create memories for different users
      await db.createMemory({
        user_id: 'user-1',
        content: 'Memory 1',
        embedding: generateMockEmbedding(),
      })
      await db.createMemory({
        user_id: 'user-1',
        content: 'Memory 2',
        embedding: generateMockEmbedding(),
      })
      await db.createMemory({
        user_id: 'user-2',
        content: 'Memory 3',
        embedding: generateMockEmbedding(),
      })
      
      const deleted = await db.deleteUserMemories('user-1')
      expect(deleted).toBe(2)
      
      const user1Memories = await db.getUserMemories('user-1')
      expect(user1Memories).toHaveLength(0)
      
      const user2Memories = await db.getUserMemories('user-2')
      expect(user2Memories).toHaveLength(1)
    })
  })
  
  describe('Knowledge base operations', () => {
    it('should create a knowledge base', async () => {
      const kb = await db.createKnowledgeBase({
        project_id: 'proj-123',
        name: 'Test KB',
        description: 'A test knowledge base',
        metadata: { domain: 'testing' },
      })
      
      expect(kb.kb_id).toBeDefined()
      expect(kb.project_id).toBe('proj-123')
      expect(kb.name).toBe('Test KB')
      expect(kb.description).toBe('A test knowledge base')
      expect(kb.metadata).toEqual({ domain: 'testing' })
    })
    
    it('should get project knowledge bases', async () => {
      await db.createKnowledgeBase({
        project_id: 'proj-1',
        name: 'KB 1',
      })
      await db.createKnowledgeBase({
        project_id: 'proj-1',
        name: 'KB 2',
      })
      await db.createKnowledgeBase({
        project_id: 'proj-2',
        name: 'KB 3',
      })
      
      const proj1Kbs = await db.getProjectKnowledgeBases('proj-1')
      expect(proj1Kbs).toHaveLength(2)
      
      const proj2Kbs = await db.getProjectKnowledgeBases('proj-2')
      expect(proj2Kbs).toHaveLength(1)
    })
  })
  
  describe('Fact operations', () => {
    it('should create a fact', async () => {
      const embedding = generateMockEmbedding()
      const fact = await db.createFact({
        kb_id: 'kb-123',
        content: 'Test fact',
        metadata: { source: 'test' },
        confidence: 0.9,
        embedding,
      })
      
      expect(fact.fact_id).toBeDefined()
      expect(fact.kb_id).toBe('kb-123')
      expect(fact.content).toBe('Test fact')
      expect(fact.confidence).toBe(0.9)
      expect(fact.embedding).toEqual(embedding)
    })
    
    it('should search facts by similarity', async () => {
      const queryEmbedding = generateMockEmbedding()
      
      await db.createFact({
        kb_id: 'kb-123',
        content: 'Similar fact',
        embedding: queryEmbedding,
      })
      await db.createFact({
        kb_id: 'kb-123',
        content: 'Different fact',
        embedding: generateMockEmbedding(),
      })
      
      const results = await db.searchFacts(
        'kb-123',
        'query',
        queryEmbedding,
        1
      )
      
      expect(results).toHaveLength(1)
      expect(results[0].content).toBe('Similar fact')
      expect(results[0].similarity_score).toBeCloseTo(1, 10)
    })
    
    it('should delete knowledge base facts', async () => {
      await db.createFact({
        kb_id: 'kb-1',
        content: 'Fact 1',
        embedding: generateMockEmbedding(),
      })
      await db.createFact({
        kb_id: 'kb-1',
        content: 'Fact 2',
        embedding: generateMockEmbedding(),
      })
      await db.createFact({
        kb_id: 'kb-2',
        content: 'Fact 3',
        embedding: generateMockEmbedding(),
      })
      
      const deleted = await db.deleteKnowledgeBaseFacts('kb-1')
      expect(deleted).toBe(2)
      
      const kb1Facts = await db.getKnowledgeBaseFacts('kb-1')
      expect(kb1Facts).toHaveLength(0)
      
      const kb2Facts = await db.getKnowledgeBaseFacts('kb-2')
      expect(kb2Facts).toHaveLength(1)
    })
  })
  
  describe('Chat operations', () => {
    it('should create a chat session', async () => {
      const session = await db.createChatSession({
        user_id: 'user-123',
        project_id: 'proj-456',
        metadata: { client: 'test' },
      })
      
      expect(session.session_id).toBeDefined()
      expect(session.user_id).toBe('user-123')
      expect(session.project_id).toBe('proj-456')
      expect(session.metadata).toEqual({ client: 'test' })
    })
    
    it('should get user chat sessions', async () => {
      await db.createChatSession({
        user_id: 'user-1',
        project_id: 'proj-1',
      })
      await db.createChatSession({
        user_id: 'user-1',
        project_id: 'proj-2',
      })
      await db.createChatSession({
        user_id: 'user-2',
        project_id: 'proj-1',
      })
      
      const user1Sessions = await db.getUserChatSessions('user-1')
      expect(user1Sessions).toHaveLength(2)
      
      const user1Proj1Sessions = await db.getUserChatSessions('user-1', 'proj-1')
      expect(user1Proj1Sessions).toHaveLength(1)
    })
    
    it('should create and get chat messages', async () => {
      const embedding = generateMockEmbedding()
      const message = await db.createChatMessage({
        session_id: 'session-123',
        role: 'user',
        content: 'Hello!',
        metadata: { timestamp: Date.now() },
        embedding,
      })
      
      expect(message.message_id).toBeDefined()
      expect(message.session_id).toBe('session-123')
      expect(message.role).toBe('user')
      expect(message.content).toBe('Hello!')
      
      const retrieved = await db.getChatMessage(message.message_id)
      expect(retrieved).toEqual(message)
    })
    
    it('should search chat messages', async () => {
      const queryEmbedding = generateMockEmbedding()
      
      await db.createChatMessage({
        session_id: 'session-123',
        role: 'user',
        content: 'Similar message',
        embedding: queryEmbedding,
      })
      await db.createChatMessage({
        session_id: 'session-123',
        role: 'assistant',
        content: 'Different message',
        embedding: generateMockEmbedding(),
      })
      
      const results = await db.searchChatMessages(
        'session-123',
        'query',
        queryEmbedding,
        1
      )
      
      expect(results).toHaveLength(1)
      expect(results[0].content).toBe('Similar message')
      expect(results[0].similarity_score).toBeCloseTo(1, 10)
    })
    
    it('should delete chat session messages', async () => {
      await db.createChatMessage({
        session_id: 'session-1',
        role: 'user',
        content: 'Message 1',
        embedding: generateMockEmbedding(),
      })
      await db.createChatMessage({
        session_id: 'session-1',
        role: 'assistant',
        content: 'Message 2',
        embedding: generateMockEmbedding(),
      })
      await db.createChatMessage({
        session_id: 'session-2',
        role: 'user',
        content: 'Message 3',
        embedding: generateMockEmbedding(),
      })
      
      const deleted = await db.deleteChatSessionMessages('session-1')
      expect(deleted).toBe(2)
      
      const session1Messages = await db.getChatMessages('session-1')
      expect(session1Messages).toHaveLength(0)
      
      const session2Messages = await db.getChatMessages('session-2')
      expect(session2Messages).toHaveLength(1)
    })
  })
  
  describe('Utility operations', () => {
    it('should close and clear all data', async () => {
      // Add some data
      const project = await db.createProject({
        user_id: 'user-123',
        name: 'Test',
      })
      const memory = await db.createMemory({
        user_id: 'user-123',
        content: 'Test',
        embedding: generateMockEmbedding(),
      })
      
      // Close database
      await db.close()
      
      // Data should be cleared
      expect(await db.getProject(project.project_id)).toBeNull()
      expect(await db.getMemory(memory.memory_id)).toBeNull()
    })
  })
})