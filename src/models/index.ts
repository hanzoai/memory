import { z } from 'zod'

// Base schemas
export const ProjectSchema = z.object({
  project_id: z.string(),
  user_id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  created_at: z.date().default(new Date()),
  updated_at: z.date().default(new Date()),
})

export const MemorySchema = z.object({
  memory_id: z.string(),
  user_id: z.string(),
  project_id: z.string().optional(),
  content: z.string(),
  metadata: z.record(z.any()).optional(),
  importance: z.number().min(0).max(10).default(5),
  created_at: z.date().default(new Date()),
  updated_at: z.date().default(new Date()),
  embedding: z.array(z.number()).optional(),
})

export const KnowledgeBaseSchema = z.object({
  kb_id: z.string(),
  project_id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  created_at: z.date().default(new Date()),
  updated_at: z.date().default(new Date()),
})

export const FactSchema = z.object({
  fact_id: z.string(),
  kb_id: z.string(),
  content: z.string(),
  metadata: z.record(z.any()).optional(),
  confidence: z.number().min(0).max(1).default(1),
  created_at: z.date().default(new Date()),
  updated_at: z.date().default(new Date()),
  embedding: z.array(z.number()).optional(),
})

export const ChatSessionSchema = z.object({
  session_id: z.string(),
  user_id: z.string(),
  project_id: z.string(),
  metadata: z.record(z.any()).optional(),
  created_at: z.date().default(new Date()),
  updated_at: z.date().default(new Date()),
})

export const ChatMessageSchema = z.object({
  message_id: z.string(),
  session_id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  metadata: z.record(z.any()).optional(),
  created_at: z.date().default(new Date()),
  embedding: z.array(z.number()).optional(),
})

// Request schemas
export const RememberRequestSchema = z.object({
  userid: z.string(),
  projectid: z.string().optional(),
  content: z.string(),
  metadata: z.record(z.any()).optional(),
  importance: z.number().min(0).max(10).optional(),
  strip_pii: z.boolean().optional(),
})

export const SearchRequestSchema = z.object({
  userid: z.string(),
  projectid: z.string().optional(),
  query: z.string(),
  limit: z.number().min(1).max(100).default(10),
  filter_with_llm: z.boolean().optional(),
  additional_context: z.string().optional(),
})

export const CreateProjectRequestSchema = z.object({
  userId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

export const CreateKnowledgeBaseRequestSchema = z.object({
  projectId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  metadata: z.record(z.any()).optional(),
})

export const AddFactRequestSchema = z.object({
  knowledgeBaseId: z.string(),
  content: z.string(),
  metadata: z.record(z.any()).optional(),
  confidence: z.number().min(0).max(1).optional(),
})

export const SearchFactsRequestSchema = z.object({
  knowledgeBaseId: z.string(),
  query: z.string().optional(),
  limit: z.number().min(1).max(100).default(10),
})

export const CreateChatSessionRequestSchema = z.object({
  userId: z.string(),
  projectId: z.string(),
  metadata: z.record(z.any()).optional(),
})

export const AddChatMessageRequestSchema = z.object({
  sessionId: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  metadata: z.record(z.any()).optional(),
})

export const SearchChatMessagesRequestSchema = z.object({
  sessionId: z.string(),
  query: z.string(),
  limit: z.number().min(1).max(100).default(10),
})

// Response schemas
export const MemoryWithScoreSchema = MemorySchema.extend({
  similarity_score: z.number(),
})

export const FactWithScoreSchema = FactSchema.extend({
  similarity_score: z.number(),
})

export const ChatMessageWithScoreSchema = ChatMessageSchema.extend({
  similarity_score: z.number(),
})

// Type exports
export type Project = z.infer<typeof ProjectSchema>
export type Memory = z.infer<typeof MemorySchema>
export type KnowledgeBase = z.infer<typeof KnowledgeBaseSchema>
export type Fact = z.infer<typeof FactSchema>
export type ChatSession = z.infer<typeof ChatSessionSchema>
export type ChatMessage = z.infer<typeof ChatMessageSchema>

export type RememberRequest = z.infer<typeof RememberRequestSchema>
export type SearchRequest = z.infer<typeof SearchRequestSchema>
export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>
export type CreateKnowledgeBaseRequest = z.infer<typeof CreateKnowledgeBaseRequestSchema>
export type AddFactRequest = z.infer<typeof AddFactRequestSchema>
export type SearchFactsRequest = z.infer<typeof SearchFactsRequestSchema>
export type CreateChatSessionRequest = z.infer<typeof CreateChatSessionRequestSchema>
export type AddChatMessageRequest = z.infer<typeof AddChatMessageRequestSchema>
export type SearchChatMessagesRequest = z.infer<typeof SearchChatMessagesRequestSchema>

export type MemoryWithScore = z.infer<typeof MemoryWithScoreSchema>
export type FactWithScore = z.infer<typeof FactWithScoreSchema>
export type ChatMessageWithScore = z.infer<typeof ChatMessageWithScoreSchema>