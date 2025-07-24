import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryService } from '../../../src/services/memory'
import { getDB } from '../../../src/db'
import { getEmbeddingService } from '../../../src/services/embeddings'
import { getLLMService } from '../../../src/services/llm'
import { config } from '../../../src/config'
import { generateMockEmbedding, testUserId, testProjectId } from '../../fixtures'

// Mock dependencies
vi.mock('../../../src/db', () => ({
  getDB: vi.fn(),
}))

vi.mock('../../../src/services/embeddings', () => ({
  getEmbeddingService: vi.fn(),
}))

vi.mock('../../../src/services/llm', () => ({
  getLLMService: vi.fn(),
}))

describe('MemoryService', () => {
  let service: MemoryService
  let mockDB: any
  let mockEmbeddings: any
  let mockLLM: any
  
  beforeEach(() => {
    // Setup mock DB
    mockDB = {
      createMemory: vi.fn().mockResolvedValue({
        memory_id: 'mem-123',
        user_id: testUserId,
        project_id: testProjectId,
        content: 'Test content',
        metadata: {},
        importance: 5,
        embedding: generateMockEmbedding(),
        created_at: new Date(),
        updated_at: new Date(),
      }),
      searchMemories: vi.fn().mockResolvedValue([
        {
          memory_id: 'mem-1',
          user_id: testUserId,
          content: 'Result 1',
          similarity_score: 0.9,
        },
        {
          memory_id: 'mem-2',
          user_id: testUserId,
          content: 'Result 2',
          similarity_score: 0.8,
        },
      ]),
      getMemory: vi.fn().mockResolvedValue({
        memory_id: 'mem-123',
        user_id: testUserId,
        content: 'Test memory',
      }),
      deleteMemory: vi.fn().mockResolvedValue(true),
      deleteUserMemories: vi.fn().mockResolvedValue(5),
    }
    
    // Setup mock embeddings
    mockEmbeddings = {
      embed: vi.fn().mockResolvedValue(generateMockEmbedding()),
    }
    
    // Setup mock LLM
    mockLLM = {
      stripPII: vi.fn().mockResolvedValue('Stripped content'),
      filterResults: vi.fn().mockImplementation((query, results) => [results[0]]),
    }
    
    // Setup mocks
    vi.mocked(getDB).mockResolvedValue(mockDB)
    vi.mocked(getEmbeddingService).mockReturnValue(mockEmbeddings)
    vi.mocked(getLLMService).mockReturnValue(mockLLM)
    
    service = new MemoryService()
  })
  
  describe('remember', () => {
    it('should create a memory', async () => {
      const request = {
        userid: testUserId,
        projectid: testProjectId,
        content: 'Test content',
        metadata: { tag: 'test' },
        importance: 7,
      }
      
      const memory = await service.remember(request)
      
      expect(mockEmbeddings.embed).toHaveBeenCalledWith('Test content')
      expect(mockDB.createMemory).toHaveBeenCalledWith({
        user_id: testUserId,
        project_id: testProjectId,
        content: 'Test content',
        metadata: { tag: 'test' },
        importance: 7,
        embedding: expect.any(Array),
      })
      expect(memory.memory_id).toBe('mem-123')
    })
    
    it('should strip PII when requested', async () => {
      const request = {
        userid: testUserId,
        content: 'My name is John Doe',
        strip_pii: true,
      }
      
      await service.remember(request)
      
      expect(mockLLM.stripPII).toHaveBeenCalledWith('My name is John Doe')
      expect(mockEmbeddings.embed).toHaveBeenCalledWith('Stripped content')
      expect(mockDB.createMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Stripped content',
        })
      )
    })
    
    it('should use default strip_pii setting', async () => {
      const originalDefault = config.stripPiiDefault
      config.stripPiiDefault = true
      
      const request = {
        userid: testUserId,
        content: 'Test content',
      }
      
      await service.remember(request)
      
      expect(mockLLM.stripPII).toHaveBeenCalled()
      
      config.stripPiiDefault = originalDefault
    })
    
    it('should use default importance', async () => {
      const request = {
        userid: testUserId,
        content: 'Test content',
      }
      
      await service.remember(request)
      
      expect(mockDB.createMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          importance: 5,
        })
      )
    })
  })
  
  describe('search', () => {
    it('should search memories', async () => {
      const request = {
        userid: testUserId,
        projectid: testProjectId,
        query: 'test query',
        limit: 5,
      }
      
      const results = await service.search(request)
      
      expect(mockEmbeddings.embed).toHaveBeenCalledWith('test query')
      expect(mockDB.searchMemories).toHaveBeenCalledWith(
        testUserId,
        'test query',
        expect.any(Array),
        testProjectId,
        5
      )
      expect(results).toHaveLength(2)
      expect(results[0].similarity_score).toBe(0.9)
    })
    
    it('should filter results with LLM when requested', async () => {
      const request = {
        userid: testUserId,
        query: 'test query',
        filter_with_llm: true,
        additional_context: 'Extra context',
      }
      
      const results = await service.search(request)
      
      expect(mockLLM.filterResults).toHaveBeenCalledWith(
        'test query',
        expect.any(Array),
        'Extra context'
      )
      expect(results).toHaveLength(1) // Filtered to 1 result
    })
    
    it('should use default filter_with_llm setting', async () => {
      const originalDefault = config.filterWithLlmDefault
      config.filterWithLlmDefault = true
      
      const request = {
        userid: testUserId,
        query: 'test query',
      }
      
      await service.search(request)
      
      expect(mockLLM.filterResults).toHaveBeenCalled()
      
      config.filterWithLlmDefault = originalDefault
    })
    
    it('should use default limit', async () => {
      const request = {
        userid: testUserId,
        query: 'test query',
      }
      
      await service.search(request)
      
      expect(mockDB.searchMemories).toHaveBeenCalledWith(
        testUserId,
        'test query',
        expect.any(Array),
        undefined,
        10 // Default limit
      )
    })
  })
  
  describe('getMemory', () => {
    it('should get a memory for the user', async () => {
      const memory = await service.getMemory(testUserId, 'mem-123')
      
      expect(mockDB.getMemory).toHaveBeenCalledWith('mem-123')
      expect(memory).toEqual({
        memory_id: 'mem-123',
        user_id: testUserId,
        content: 'Test memory',
      })
    })
    
    it('should return null if memory not found', async () => {
      mockDB.getMemory.mockResolvedValueOnce(null)
      
      const memory = await service.getMemory(testUserId, 'mem-123')
      
      expect(memory).toBeNull()
    })
    
    it('should return null if memory belongs to different user', async () => {
      mockDB.getMemory.mockResolvedValueOnce({
        memory_id: 'mem-123',
        user_id: 'different-user',
        content: 'Test memory',
      })
      
      const memory = await service.getMemory(testUserId, 'mem-123')
      
      expect(memory).toBeNull()
    })
  })
  
  describe('deleteMemory', () => {
    it('should delete a memory for the user', async () => {
      const deleted = await service.deleteMemory(testUserId, 'mem-123')
      
      expect(mockDB.getMemory).toHaveBeenCalledWith('mem-123')
      expect(mockDB.deleteMemory).toHaveBeenCalledWith('mem-123')
      expect(deleted).toBe(true)
    })
    
    it('should return false if memory not found', async () => {
      mockDB.getMemory.mockResolvedValueOnce(null)
      
      const deleted = await service.deleteMemory(testUserId, 'mem-123')
      
      expect(mockDB.deleteMemory).not.toHaveBeenCalled()
      expect(deleted).toBe(false)
    })
    
    it('should return false if memory belongs to different user', async () => {
      mockDB.getMemory.mockResolvedValueOnce({
        memory_id: 'mem-123',
        user_id: 'different-user',
        content: 'Test memory',
      })
      
      const deleted = await service.deleteMemory(testUserId, 'mem-123')
      
      expect(mockDB.deleteMemory).not.toHaveBeenCalled()
      expect(deleted).toBe(false)
    })
  })
  
  describe('deleteUserMemories', () => {
    it('should delete all user memories', async () => {
      const count = await service.deleteUserMemories(testUserId)
      
      expect(mockDB.deleteUserMemories).toHaveBeenCalledWith(testUserId)
      expect(count).toBe(5)
    })
  })
})