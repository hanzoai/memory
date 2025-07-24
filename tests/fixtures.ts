import type {
  RememberRequest,
  SearchRequest,
  CreateProjectRequest,
  CreateKnowledgeBaseRequest,
  AddFactRequest,
  CreateChatSessionRequest,
  AddChatMessageRequest,
} from '../src/models'

export const testUserId = 'test-user-123'
export const testProjectId = 'test-project-456'
export const testKbId = 'test-kb-789'
export const testSessionId = 'test-session-abc'

export const testRememberRequest: RememberRequest = {
  userid: testUserId,
  projectid: testProjectId,
  content: 'The user prefers dark mode and uses VSCode',
  metadata: { category: 'preferences' },
  importance: 8,
}

export const testSearchRequest: SearchRequest = {
  userid: testUserId,
  projectid: testProjectId,
  query: 'What IDE does the user prefer?',
  limit: 5,
}

export const testCreateProjectRequest: CreateProjectRequest = {
  userId: testUserId,
  name: 'Test Project',
  description: 'A test project for unit tests',
  metadata: { type: 'test' },
}

export const testCreateKbRequest: CreateKnowledgeBaseRequest = {
  projectId: testProjectId,
  name: 'Test Knowledge Base',
  description: 'A test KB for unit tests',
  metadata: { domain: 'testing' },
}

export const testAddFactRequest: AddFactRequest = {
  knowledgeBaseId: testKbId,
  content: 'TypeScript is a superset of JavaScript',
  metadata: { source: 'documentation' },
  confidence: 0.95,
}

export const testCreateSessionRequest: CreateChatSessionRequest = {
  userId: testUserId,
  projectId: testProjectId,
  metadata: { client: 'test-suite' },
}

export const testAddMessageRequest: AddChatMessageRequest = {
  sessionId: testSessionId,
  role: 'user',
  content: 'Hello, how can I use this memory service?',
  metadata: { timestamp: Date.now() },
}

export const testMemories = [
  {
    content: 'User likes dark themes',
    importance: 9,
  },
  {
    content: 'User prefers TypeScript over JavaScript',
    importance: 8,
  },
  {
    content: 'User uses Visual Studio Code',
    importance: 7,
  },
  {
    content: 'User works on weekends',
    importance: 5,
  },
  {
    content: 'User drinks coffee',
    importance: 3,
  },
]

export const testFacts = [
  {
    content: 'JavaScript was created in 1995',
    confidence: 1.0,
  },
  {
    content: 'TypeScript adds static typing to JavaScript',
    confidence: 1.0,
  },
  {
    content: 'Node.js uses the V8 engine',
    confidence: 1.0,
  },
]

export const testMessages = [
  {
    role: 'user' as const,
    content: 'What is the memory service?',
  },
  {
    role: 'assistant' as const,
    content: 'The memory service allows you to store and retrieve contextual information.',
  },
  {
    role: 'user' as const,
    content: 'How do I search memories?',
  },
  {
    role: 'assistant' as const,
    content: 'You can search memories using semantic search with the search() method.',
  },
]

// Helper to generate random embedding
export function generateMockEmbedding(dimensions = 384): number[] {
  return Array.from({ length: dimensions }, () => Math.random() * 2 - 1)
}

// Helper to simulate delay
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}