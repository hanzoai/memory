import Fastify from 'fastify'
import { MemoryClient } from './client'
import { config } from './config'

const fastify = Fastify({
  logger: true,
})

const client = new MemoryClient()

// Health check
fastify.get('/health', async () => {
  return {
    status: 'healthy',
    service: 'hanzo-memory-js',
    version: '0.1.0',
    database: config.dbBackend,
  }
})

// Project endpoints
fastify.post('/v1/project/create', async (request, reply) => {
  try {
    const project = await client.createProject(request.body as any)
    return {
      success: true,
      project,
    }
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

fastify.get('/v1/projects', async (request: any, reply) => {
  try {
    const { user_id } = request.query
    if (!user_id) {
      return reply.code(400).send({
        success: false,
        error: 'user_id required',
      })
    }
    
    const projects = await client.getUserProjects(user_id)
    return {
      success: true,
      projects,
    }
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// Memory endpoints
fastify.post('/v1/remember', async (request, reply) => {
  try {
    const memory = await client.remember(request.body as any)
    return {
      success: true,
      memory,
    }
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// Alias for remember
fastify.post('/v1/memories/add', async (request, reply) => {
  try {
    const memory = await client.remember(request.body as any)
    return {
      success: true,
      memory,
    }
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// Search endpoint
fastify.post('/v1/memories/search', async (request, reply) => {
  try {
    const results = await client.search(request.body as any)
    return {
      success: true,
      memories: results,
    }
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// Get memory endpoint
fastify.post('/v1/memories/get', async (request: any, reply) => {
  try {
    const { user_id, memory_id } = request.body
    if (!user_id || !memory_id) {
      return reply.code(400).send({
        success: false,
        error: 'user_id and memory_id required',
      })
    }
    
    const memory = await client.getMemory(user_id, memory_id)
    if (!memory) {
      return reply.code(404).send({
        success: false,
        error: 'Memory not found',
      })
    }
    
    return {
      success: true,
      memory,
    }
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// Delete memory endpoints
fastify.delete('/v1/memories', async (request: any, reply) => {
  try {
    const { user_id, memory_id } = request.query
    if (!user_id || !memory_id) {
      return reply.code(400).send({
        success: false,
        error: 'user_id and memory_id required',
      })
    }
    
    const deleted = await client.deleteMemory(user_id, memory_id)
    return {
      success: true,
      deleted,
    }
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// RPC-style delete
fastify.post('/v1/memories/delete', async (request: any, reply) => {
  try {
    const { user_id, memory_id } = request.body
    if (!user_id || !memory_id) {
      return reply.code(400).send({
        success: false,
        error: 'user_id and memory_id required',
      })
    }
    
    const deleted = await client.deleteMemory(user_id, memory_id)
    return {
      success: true,
      deleted,
    }
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// Delete all user data
fastify.post('/v1/user/delete', async (request: any, reply) => {
  try {
    const { user_id } = request.body
    if (!user_id) {
      return reply.code(400).send({
        success: false,
        error: 'user_id required',
      })
    }
    
    const count = await client.deleteUserMemories(user_id)
    return {
      success: true,
      deleted_count: count,
    }
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// Knowledge base endpoints
fastify.post('/v1/kb/create', async (request, reply) => {
  try {
    const kb = await client.createKnowledgeBase(request.body as any)
    return {
      success: true,
      knowledge_base: kb,
    }
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

fastify.get('/v1/kb/list', async (request: any, reply) => {
  try {
    const { project_id } = request.query
    if (!project_id) {
      return reply.code(400).send({
        success: false,
        error: 'project_id required',
      })
    }
    
    const kbs = await client.getProjectKnowledgeBases(project_id)
    return {
      success: true,
      knowledge_bases: kbs,
    }
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// Fact endpoints
fastify.post('/v1/kb/facts/add', async (request, reply) => {
  try {
    const fact = await client.addFact(request.body as any)
    return {
      success: true,
      fact,
    }
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

fastify.post('/v1/kb/facts/get', async (request, reply) => {
  try {
    const facts = await client.searchFacts(request.body as any)
    return {
      success: true,
      facts,
    }
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

fastify.post('/v1/kb/facts/delete', async (request: any, reply) => {
  try {
    const { kb_id } = request.body
    if (!kb_id) {
      return reply.code(400).send({
        success: false,
        error: 'kb_id required',
      })
    }
    
    const count = await client.deleteKnowledgeBaseFacts(kb_id)
    return {
      success: true,
      deleted_count: count,
    }
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// Chat endpoints
fastify.post('/v1/chat/sessions/create', async (request, reply) => {
  try {
    const session = await client.createChatSession(request.body as any)
    return {
      success: true,
      session,
    }
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

fastify.post('/v1/chat/messages/add', async (request, reply) => {
  try {
    const message = await client.addChatMessage(request.body as any)
    return {
      success: true,
      message,
    }
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

fastify.get('/v1/chat/sessions/:session_id/messages', async (request: any, reply) => {
  try {
    const { session_id } = request.params
    const { limit, offset } = request.query
    
    const messages = await client.getChatMessages(
      session_id,
      limit ? parseInt(limit) : undefined,
      offset ? parseInt(offset) : undefined
    )
    
    return {
      success: true,
      messages,
    }
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

fastify.post('/v1/chat/search', async (request, reply) => {
  try {
    const messages = await client.searchChatMessages(request.body as any)
    return {
      success: true,
      messages,
    }
  } catch (error) {
    return reply.code(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

export { fastify }

export async function startServer(port = 8000, host = '0.0.0.0') {
  try {
    await fastify.listen({ port, host })
    console.log(`Server listening on ${host}:${port}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

// Start server if run directly
if (require.main === module) {
  const port = parseInt(process.env.PORT || '8000')
  const host = process.env.HOST || '0.0.0.0'
  startServer(port, host)
}