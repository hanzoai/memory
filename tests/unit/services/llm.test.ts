import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  OpenAILLMService,
  MockLLMService,
  getLLMService,
  setLLMService,
} from '../../../src/services/llm'
import { config } from '../../../src/config'

// Mock OpenAI
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{
            message: { content: 'Test response' },
          }],
        }),
      },
    },
  })),
}))

describe('LLMService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })
  
  describe('OpenAILLMService', () => {
    it('should throw error without API key', () => {
      const originalKey = config.openaiApiKey
      config.openaiApiKey = undefined
      
      expect(() => new OpenAILLMService()).toThrow('OpenAI API key required')
      
      config.openaiApiKey = originalKey
    })
    
    it('should complete a prompt', async () => {
      const service = new OpenAILLMService('test-key')
      const response = await service.complete('Hello')
      
      expect(response).toBe('Test response')
    })
    
    it('should complete with system prompt', async () => {
      const service = new OpenAILLMService('test-key')
      await service.complete('Hello', 'You are helpful')
      
      const OpenAI = (await import('openai')).default
      const instance = (OpenAI as any).mock.results[0].value
      expect(instance.chat.completions.create).toHaveBeenCalledWith({
        model: config.openaiModel,
        messages: [
          { role: 'system', content: 'You are helpful' },
          { role: 'user', content: 'Hello' },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      })
    })
    
    it('should strip PII', async () => {
      const service = new OpenAILLMService('test-key')
      const result = await service.stripPII('My name is John Doe')
      
      expect(result).toBe('Test response')
      
      const OpenAI = (await import('openai')).default
      const instance = (OpenAI as any).mock.results[0].value
      const call = instance.chat.completions.create.mock.calls[0][0]
      expect(call.messages[0].role).toBe('system')
      expect(call.messages[0].content).toContain('PII removal')
      expect(call.messages[1].content).toContain('My name is John Doe')
    })
    
    it('should filter results', async () => {
      const service = new OpenAILLMService('test-key')
      
      // Mock response with valid JSON
      const OpenAI = (await import('openai')).default
      const instance = (OpenAI as any).mock.results[0].value
      instance.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: { content: '[0, 2]' },
        }],
      })
      
      const results = [
        { content: 'Relevant 1' },
        { content: 'Not relevant' },
        { content: 'Relevant 2' },
      ]
      
      const filtered = await service.filterResults('test query', results)
      
      expect(filtered).toHaveLength(2)
      expect(filtered[0].content).toBe('Relevant 1')
      expect(filtered[1].content).toBe('Relevant 2')
    })
    
    it('should return all results if filtering fails', async () => {
      const service = new OpenAILLMService('test-key')
      
      // Mock response with invalid JSON
      const OpenAI = (await import('openai')).default
      const instance = (OpenAI as any).mock.results[0].value
      instance.chat.completions.create.mockResolvedValueOnce({
        choices: [{
          message: { content: 'invalid json' },
        }],
      })
      
      const results = [
        { content: 'Result 1' },
        { content: 'Result 2' },
      ]
      
      const filtered = await service.filterResults('test query', results)
      
      expect(filtered).toEqual(results)
    })
    
    it('should handle empty results', async () => {
      const service = new OpenAILLMService('test-key')
      const filtered = await service.filterResults('test query', [])
      expect(filtered).toEqual([])
    })
  })
  
  describe('MockLLMService', () => {
    it('should complete a prompt', async () => {
      const service = new MockLLMService()
      const response = await service.complete('Hello')
      
      expect(response).toBe('Mock response to: Hello')
    })
    
    it('should strip PII with simple rules', async () => {
      const service = new MockLLMService()
      
      const result = await service.stripPII(
        'My name is John Doe, email: john@example.com, phone: 555-123-4567, SSN: 123-45-6789'
      )
      
      expect(result).toContain('[NAME]')
      expect(result).toContain('[EMAIL]')
      expect(result).toContain('[PHONE]')
      expect(result).toContain('[SSN]')
      expect(result).not.toContain('John Doe')
      expect(result).not.toContain('john@example.com')
      expect(result).not.toContain('555-123-4567')
      expect(result).not.toContain('123-45-6789')
    })
    
    it('should filter results by keywords', async () => {
      const service = new MockLLMService()
      
      const results = [
        { content: 'This contains the test keyword' },
        { content: 'This does not contain it' },
        { content: 'Another test result' },
      ]
      
      const filtered = await service.filterResults('test keyword', results)
      
      expect(filtered).toHaveLength(2)
      expect(filtered[0].content).toContain('test')
      expect(filtered[1].content).toContain('test')
    })
  })
  
  describe('getLLMService', () => {
    beforeEach(() => {
      // Reset service
      setLLMService(null as any)
    })
    
    it('should return OpenAILLMService when API key is set', () => {
      const originalKey = config.openaiApiKey
      config.openaiApiKey = 'test-key'
      
      const service = getLLMService()
      expect(service).toBeInstanceOf(OpenAILLMService)
      
      config.openaiApiKey = originalKey
    })
    
    it('should return MockLLMService when no API key', () => {
      const originalKey = config.openaiApiKey
      config.openaiApiKey = undefined
      
      const service = getLLMService()
      expect(service).toBeInstanceOf(MockLLMService)
      
      config.openaiApiKey = originalKey
    })
    
    it('should return cached instance', () => {
      const service1 = getLLMService()
      const service2 = getLLMService()
      expect(service1).toBe(service2)
    })
  })
  
  describe('setLLMService', () => {
    it('should set custom LLM service', () => {
      const customService = new MockLLMService()
      setLLMService(customService)
      
      const service = getLLMService()
      expect(service).toBe(customService)
    })
  })
})