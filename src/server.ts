import Fastify from 'fastify'
import { MemoryClient } from './client'
import { RememberRequestSchema, SearchRequestSchema } from './models'
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

// Remember endpoint
fastify.post('/v1/remember', {
  schema: {
    body: RememberRequestSchema,
  },
}, async (request, reply) => {
  try {
    const memory = await client.remember(request.body)
    return {
      success: true,
      memory,
    }
  } catch (error) {
    reply.code(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// Search endpoint
fastify.post('/v1/memories/search', {
  schema: {
    body: SearchRequestSchema,
  },
}, async (request, reply) => {
  try {
    const memories = await client.search(request.body)
    return {
      success: true,
      memories,
      count: memories.length,
    }
  } catch (error) {
    reply.code(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// Get memories
fastify.get('/v1/memories', {
  schema: {
    querystring: {
      userid: { type: 'string' },
      memoryid: { type: 'string', nullable: true },
    },
  },
}, async (request, reply) => {
  const { userid, memoryid } = request.query as any
  
  try {
    if (memoryid) {
      const memory = await client.getMemory(userid, memoryid)
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
    } else {
      // TODO: Implement pagination
      return {
        success: true,
        memories: [],
        pagination: { has_more: false },
      }
    }
  } catch (error) {
    reply.code(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// Delete memories
fastify.delete('/v1/memories', {
  schema: {
    querystring: {
      userid: { type: 'string' },
      memoryid: { type: 'string', nullable: true },
    },
  },
}, async (request, reply) => {
  const { userid, memoryid } = request.query as any
  
  try {
    if (memoryid) {
      const deleted = await client.deleteMemory(userid, memoryid)
      return {
        success: true,
        deleted,
      }
    } else {
      const count = await client.deleteUserMemories(userid)
      return {
        success: true,
        deleted_count: count,
        message: count > 0 ? 'Memories deleted successfully' : 'No memories found for user',
      }
    }
  } catch (error) {
    reply.code(500).send({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// Start server
export async function startServer() {
  try {
    const address = await fastify.listen({
      port: config.port,
      host: config.host,
    })
    console.log(`Hanzo Memory JS server listening on ${address}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

// Export for programmatic use
export { fastify }

// Run if called directly
if (require.main === module) {
  startServer()
}