import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { MemoryClient } from '../../src/client'
import { closeDB } from '../../src/db'
import { config } from '../../src/config'
import {
  testUserId,
  testProjectId,
  testRememberRequest,
  testSearchRequest,
  testCreateProjectRequest,
  testCreateKbRequest,
  testAddFactRequest,
  testCreateSessionRequest,
  testAddMessageRequest,
} from '../fixtures'

describe('MemoryClient Integration', () => {
  let client: MemoryClient
  
  beforeEach(() => {
    // Force in-memory database for tests to avoid LanceDB/sharp issues
    process.env.DB_BACKEND = 'memory'
    config.dbBackend = 'memory'
    client = new MemoryClient()
  })
  
  afterEach(async () => {
    await client.close()
    await closeDB()
  })
  
  describe('Project operations', () => {
    it('should create and retrieve a project', async () => {
      const project = await client.createProject(testCreateProjectRequest)
      
      expect(project.project_id).toBeDefined()
      expect(project.name).toBe('Test Project')
      expect(project.user_id).toBe(testUserId)
      
      const retrieved = await client.getProject(project.project_id)
      expect(retrieved).toEqual(project)
    })
    
    it('should list user projects', async () => {
      await client.createProject(testCreateProjectRequest)
      await client.createProject({
        ...testCreateProjectRequest,
        name: 'Another Project',
      })
      
      const projects = await client.getUserProjects(testUserId)
      expect(projects).toHaveLength(2)
    })
    
    it('should delete a project', async () => {
      const project = await client.createProject(testCreateProjectRequest)
      
      const deleted = await client.deleteProject(project.project_id)
      expect(deleted).toBe(true)
      
      const retrieved = await client.getProject(project.project_id)
      expect(retrieved).toBeNull()
    })
  })
  
  describe('Memory operations', () => {
    it('should remember and search memories', async () => {
      // Create a project first
      const project = await client.createProject(testCreateProjectRequest)
      
      // Remember some content
      const memory = await client.remember({
        ...testRememberRequest,
        projectid: project.project_id,
      })
      
      expect(memory.memory_id).toBeDefined()
      expect(memory.content).toBe(testRememberRequest.content)
      
      // Search for it
      const results = await client.search({
        ...testSearchRequest,
        projectid: project.project_id,
      })
      
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].content).toBe(testRememberRequest.content)
      expect(results[0].similarity_score).toBeDefined()
    })
    
    it('should get a specific memory', async () => {
      const memory = await client.remember(testRememberRequest)
      
      const retrieved = await client.getMemory(testUserId, memory.memory_id)
      expect(retrieved).toEqual(memory)
    })
    
    it('should delete a memory', async () => {
      const memory = await client.remember(testRememberRequest)
      
      const deleted = await client.deleteMemory(testUserId, memory.memory_id)
      expect(deleted).toBe(true)
      
      const retrieved = await client.getMemory(testUserId, memory.memory_id)
      expect(retrieved).toBeNull()
    })
    
    it('should delete all user memories', async () => {
      await client.remember(testRememberRequest)
      await client.remember({
        ...testRememberRequest,
        content: 'Another memory',
      })
      
      const count = await client.deleteUserMemories(testUserId)
      expect(count).toBe(2)
      
      const results = await client.search({
        userid: testUserId,
        query: 'memory',
      })
      expect(results).toHaveLength(0)
    })
  })
  
  describe('Knowledge base operations', () => {
    let project: any
    
    beforeEach(async () => {
      project = await client.createProject(testCreateProjectRequest)
    })
    
    it('should create and list knowledge bases', async () => {
      const kb = await client.createKnowledgeBase({
        ...testCreateKbRequest,
        projectId: project.project_id,
      })
      
      expect(kb.kb_id).toBeDefined()
      expect(kb.name).toBe('Test Knowledge Base')
      
      const kbs = await client.getProjectKnowledgeBases(project.project_id)
      expect(kbs).toHaveLength(1)
      expect(kbs[0]).toEqual(kb)
    })
    
    it('should add and search facts', async () => {
      const kb = await client.createKnowledgeBase({
        ...testCreateKbRequest,
        projectId: project.project_id,
      })
      
      const fact = await client.addFact({
        ...testAddFactRequest,
        knowledgeBaseId: kb.kb_id,
      })
      
      expect(fact.fact_id).toBeDefined()
      expect(fact.content).toBe(testAddFactRequest.content)
      
      // Search facts
      const results = await client.searchFacts({
        knowledgeBaseId: kb.kb_id,
        query: 'TypeScript',
        limit: 5,
      })
      
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].content).toBe(testAddFactRequest.content)
      expect(results[0].similarity_score).toBeDefined()
    })
    
    it('should get all facts without query', async () => {
      const kb = await client.createKnowledgeBase({
        ...testCreateKbRequest,
        projectId: project.project_id,
      })
      
      await client.addFact({
        knowledgeBaseId: kb.kb_id,
        content: 'Fact 1',
      })
      await client.addFact({
        knowledgeBaseId: kb.kb_id,
        content: 'Fact 2',
      })
      
      const facts = await client.searchFacts({
        knowledgeBaseId: kb.kb_id,
      })
      
      expect(facts).toHaveLength(2)
      expect(facts[0].similarity_score).toBe(1) // No search = perfect score
    })
    
    it('should delete facts', async () => {
      const kb = await client.createKnowledgeBase({
        ...testCreateKbRequest,
        projectId: project.project_id,
      })
      
      const fact = await client.addFact({
        ...testAddFactRequest,
        knowledgeBaseId: kb.kb_id,
      })
      
      const deleted = await client.deleteFact(fact.fact_id)
      expect(deleted).toBe(true)
      
      const retrieved = await client.getFact(fact.fact_id)
      expect(retrieved).toBeNull()
    })
    
    it('should delete all knowledge base facts', async () => {
      const kb = await client.createKnowledgeBase({
        ...testCreateKbRequest,
        projectId: project.project_id,
      })
      
      await client.addFact({
        knowledgeBaseId: kb.kb_id,
        content: 'Fact 1',
      })
      await client.addFact({
        knowledgeBaseId: kb.kb_id,
        content: 'Fact 2',
      })
      
      const count = await client.deleteKnowledgeBaseFacts(kb.kb_id)
      expect(count).toBe(2)
      
      const facts = await client.getKnowledgeBaseFacts(kb.kb_id)
      expect(facts).toHaveLength(0)
    })
  })
  
  describe('Chat operations', () => {
    let project: any
    
    beforeEach(async () => {
      project = await client.createProject(testCreateProjectRequest)
    })
    
    it('should create chat sessions', async () => {
      const session = await client.createChatSession({
        ...testCreateSessionRequest,
        projectId: project.project_id,
      })
      
      expect(session.session_id).toBeDefined()
      expect(session.user_id).toBe(testUserId)
      expect(session.project_id).toBe(project.project_id)
      
      const sessions = await client.getUserChatSessions(testUserId)
      expect(sessions).toHaveLength(1)
      expect(sessions[0]).toEqual(session)
    })
    
    it('should add and retrieve chat messages', async () => {
      const session = await client.createChatSession({
        ...testCreateSessionRequest,
        projectId: project.project_id,
      })
      
      const message = await client.addChatMessage({
        ...testAddMessageRequest,
        sessionId: session.session_id,
      })
      
      expect(message.message_id).toBeDefined()
      expect(message.content).toBe(testAddMessageRequest.content)
      expect(message.role).toBe('user')
      
      const messages = await client.getChatMessages(session.session_id)
      expect(messages).toHaveLength(1)
      expect(messages[0]).toEqual(message)
    })
    
    it('should search chat messages', async () => {
      const session = await client.createChatSession({
        ...testCreateSessionRequest,
        projectId: project.project_id,
      })
      
      await client.addChatMessage({
        sessionId: session.session_id,
        role: 'user',
        content: 'What is TypeScript?',
      })
      
      await client.addChatMessage({
        sessionId: session.session_id,
        role: 'assistant',
        content: 'TypeScript is a typed superset of JavaScript',
      })
      
      const results = await client.searchChatMessages({
        sessionId: session.session_id,
        query: 'TypeScript',
        limit: 5,
      })
      
      expect(results.length).toBeGreaterThan(0)
      expect(results[0].similarity_score).toBeDefined()
    })
    
    it('should delete chat messages', async () => {
      const session = await client.createChatSession({
        ...testCreateSessionRequest,
        projectId: project.project_id,
      })
      
      const message = await client.addChatMessage({
        ...testAddMessageRequest,
        sessionId: session.session_id,
      })
      
      const deleted = await client.deleteChatMessage(message.message_id)
      expect(deleted).toBe(true)
      
      const messages = await client.getChatMessages(session.session_id)
      expect(messages).toHaveLength(0)
    })
    
    it('should delete all session messages', async () => {
      const session = await client.createChatSession({
        ...testCreateSessionRequest,
        projectId: project.project_id,
      })
      
      await client.addChatMessage({
        sessionId: session.session_id,
        role: 'user',
        content: 'Message 1',
      })
      await client.addChatMessage({
        sessionId: session.session_id,
        role: 'assistant',
        content: 'Message 2',
      })
      
      const count = await client.deleteChatSessionMessages(session.session_id)
      expect(count).toBe(2)
      
      const messages = await client.getChatMessages(session.session_id)
      expect(messages).toHaveLength(0)
    })
    
    it('should delete chat session', async () => {
      const session = await client.createChatSession({
        ...testCreateSessionRequest,
        projectId: project.project_id,
      })
      
      const deleted = await client.deleteChatSession(session.session_id)
      expect(deleted).toBe(true)
      
      const retrieved = await client.getChatSession(session.session_id)
      expect(retrieved).toBeNull()
    })
  })
})