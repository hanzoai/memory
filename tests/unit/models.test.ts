import { describe, it, expect } from 'vitest'
import {
  ProjectSchema,
  MemorySchema,
  KnowledgeBaseSchema,
  FactSchema,
  ChatSessionSchema,
  ChatMessageSchema,
  RememberRequestSchema,
  SearchRequestSchema,
  CreateProjectRequestSchema,
  CreateKnowledgeBaseRequestSchema,
  AddFactRequestSchema,
  SearchFactsRequestSchema,
  CreateChatSessionRequestSchema,
  AddChatMessageRequestSchema,
  SearchChatMessagesRequestSchema,
} from '../../src/models'

describe('Model Schemas', () => {
  describe('ProjectSchema', () => {
    it('should validate a valid project', () => {
      const project = {
        project_id: 'proj-123',
        user_id: 'user-456',
        name: 'Test Project',
        description: 'A test project',
        metadata: { key: 'value' },
        created_at: new Date(),
        updated_at: new Date(),
      }
      
      const result = ProjectSchema.safeParse(project)
      expect(result.success).toBe(true)
    })
    
    it('should require required fields', () => {
      const project = {
        name: 'Test Project',
      }
      
      const result = ProjectSchema.safeParse(project)
      expect(result.success).toBe(false)
    })
  })
  
  describe('MemorySchema', () => {
    it('should validate a valid memory', () => {
      const memory = {
        memory_id: 'mem-123',
        user_id: 'user-456',
        project_id: 'proj-789',
        content: 'Test memory content',
        metadata: { tags: ['test'] },
        importance: 7,
        created_at: new Date(),
        updated_at: new Date(),
        embedding: [0.1, 0.2, 0.3],
      }
      
      const result = MemorySchema.safeParse(memory)
      expect(result.success).toBe(true)
    })
    
    it('should enforce importance constraints', () => {
      const memory = {
        memory_id: 'mem-123',
        user_id: 'user-456',
        content: 'Test memory',
        importance: 15, // Out of range
      }
      
      const result = MemorySchema.safeParse(memory)
      expect(result.success).toBe(false)
    })
    
    it('should default importance to 5', () => {
      const memory = {
        memory_id: 'mem-123',
        user_id: 'user-456',
        content: 'Test memory',
      }
      
      const result = MemorySchema.safeParse(memory)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.importance).toBe(5)
      }
    })
  })
  
  describe('KnowledgeBaseSchema', () => {
    it('should validate a valid knowledge base', () => {
      const kb = {
        kb_id: 'kb-123',
        project_id: 'proj-456',
        name: 'Test KB',
        description: 'A test knowledge base',
        metadata: { domain: 'testing' },
        created_at: new Date(),
        updated_at: new Date(),
      }
      
      const result = KnowledgeBaseSchema.safeParse(kb)
      expect(result.success).toBe(true)
    })
  })
  
  describe('FactSchema', () => {
    it('should validate a valid fact', () => {
      const fact = {
        fact_id: 'fact-123',
        kb_id: 'kb-456',
        content: 'Test fact',
        metadata: { source: 'test' },
        confidence: 0.9,
        created_at: new Date(),
        updated_at: new Date(),
        embedding: [0.1, 0.2, 0.3],
      }
      
      const result = FactSchema.safeParse(fact)
      expect(result.success).toBe(true)
    })
    
    it('should enforce confidence constraints', () => {
      const fact = {
        fact_id: 'fact-123',
        kb_id: 'kb-456',
        content: 'Test fact',
        confidence: 1.5, // Out of range
      }
      
      const result = FactSchema.safeParse(fact)
      expect(result.success).toBe(false)
    })
    
    it('should default confidence to 1', () => {
      const fact = {
        fact_id: 'fact-123',
        kb_id: 'kb-456',
        content: 'Test fact',
      }
      
      const result = FactSchema.safeParse(fact)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.confidence).toBe(1)
      }
    })
  })
  
  describe('ChatSessionSchema', () => {
    it('should validate a valid chat session', () => {
      const session = {
        session_id: 'session-123',
        user_id: 'user-456',
        project_id: 'proj-789',
        metadata: { client: 'web' },
        created_at: new Date(),
        updated_at: new Date(),
      }
      
      const result = ChatSessionSchema.safeParse(session)
      expect(result.success).toBe(true)
    })
  })
  
  describe('ChatMessageSchema', () => {
    it('should validate a valid chat message', () => {
      const message = {
        message_id: 'msg-123',
        session_id: 'session-456',
        role: 'user',
        content: 'Test message',
        metadata: { timestamp: Date.now() },
        created_at: new Date(),
        embedding: [0.1, 0.2, 0.3],
      }
      
      const result = ChatMessageSchema.safeParse(message)
      expect(result.success).toBe(true)
    })
    
    it('should enforce role constraints', () => {
      const message = {
        message_id: 'msg-123',
        session_id: 'session-456',
        role: 'invalid', // Invalid role
        content: 'Test message',
      }
      
      const result = ChatMessageSchema.safeParse(message)
      expect(result.success).toBe(false)
    })
  })
  
  describe('Request Schemas', () => {
    it('should validate RememberRequest', () => {
      const request = {
        userid: 'user-123',
        projectid: 'proj-456',
        content: 'Test memory',
        metadata: { key: 'value' },
        importance: 8,
        strip_pii: true,
      }
      
      const result = RememberRequestSchema.safeParse(request)
      expect(result.success).toBe(true)
    })
    
    it('should validate SearchRequest', () => {
      const request = {
        userid: 'user-123',
        projectid: 'proj-456',
        query: 'test query',
        limit: 10,
        filter_with_llm: true,
        additional_context: 'extra info',
      }
      
      const result = SearchRequestSchema.safeParse(request)
      expect(result.success).toBe(true)
    })
    
    it('should enforce limit constraints in SearchRequest', () => {
      const request = {
        userid: 'user-123',
        query: 'test query',
        limit: 200, // Exceeds max
      }
      
      const result = SearchRequestSchema.safeParse(request)
      expect(result.success).toBe(false)
    })
    
    it('should default limit in SearchRequest', () => {
      const request = {
        userid: 'user-123',
        query: 'test query',
      }
      
      const result = SearchRequestSchema.safeParse(request)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.limit).toBe(10)
      }
    })
    
    it('should validate CreateProjectRequest', () => {
      const request = {
        userId: 'user-123',
        name: 'New Project',
        description: 'Project description',
        metadata: { type: 'test' },
      }
      
      const result = CreateProjectRequestSchema.safeParse(request)
      expect(result.success).toBe(true)
    })
    
    it('should validate AddFactRequest', () => {
      const request = {
        knowledgeBaseId: 'kb-123',
        content: 'New fact',
        metadata: { source: 'test' },
        confidence: 0.8,
      }
      
      const result = AddFactRequestSchema.safeParse(request)
      expect(result.success).toBe(true)
    })
    
    it('should validate AddChatMessageRequest', () => {
      const request = {
        sessionId: 'session-123',
        role: 'assistant',
        content: 'Response message',
        metadata: { model: 'gpt-4' },
      }
      
      const result = AddChatMessageRequestSchema.safeParse(request)
      expect(result.success).toBe(true)
    })
  })
})