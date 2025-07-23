# @hanzo/memory

AI memory service for TypeScript/JavaScript applications with LanceDB vector database. Works in Node.js, browsers, and edge environments.

## Features

- 🧠 **Intelligent Memory Management**: Store and retrieve contextual memories with semantic search
- 📚 **Knowledge Base System**: Organize facts in hierarchical knowledge bases
- 💬 **Chat History**: Store and search conversation history
- 🔍 **Vector Search**: Fast semantic search using local or cloud embeddings
- 🌐 **Cross-Platform**: Works in Node.js, browsers, and edge environments
- 🗄️ **LanceDB**: Modern vector database with WASM support for browsers
- 🔌 **Flexible Embeddings**: Use local models (Transformers.js) or OpenAI
- 🤖 **LLM Integration**: Optional OpenAI integration for advanced features

## Installation

```bash
npm install @hanzo/memory
# or
yarn add @hanzo/memory
# or
pnpm add @hanzo/memory
```

## Quick Start

```typescript
import { MemoryClient } from '@hanzo/memory'

// Initialize the client
const client = new MemoryClient()

// Store a memory
const memory = await client.remember({
  userid: 'user123',
  projectid: 'project456',
  content: 'The user prefers dark mode and uses VSCode',
  metadata: { category: 'preferences' },
  importance: 8,
})

// Search memories
const results = await client.search({
  userid: 'user123',
  query: 'What IDE does the user prefer?',
  limit: 5,
})

console.log(results[0].content) // "The user prefers dark mode and uses VSCode"
console.log(results[0].similarity_score) // 0.92
```

## Configuration

Set environment variables or pass configuration:

```typescript
// Via environment variables
process.env.HANZO_DB_BACKEND = 'lancedb' // or 'memory' for in-memory
process.env.HANZO_EMBEDDING_MODEL = 'Xenova/all-MiniLM-L6-v2'
process.env.OPENAI_API_KEY = 'your-key' // Optional, for OpenAI embeddings/LLM

// Or configure programmatically
import { loadConfig } from '@hanzo/memory'

const config = loadConfig({
  dbBackend: 'lancedb',
  embeddingModel: 'Xenova/all-MiniLM-L6-v2',
  openaiApiKey: 'your-key',
})
```

## Browser Usage

The library works in browsers with some considerations:

```html
<!DOCTYPE html>
<html>
<head>
  <script type="module">
    import { MemoryClient } from 'https://unpkg.com/@hanzo/memory'
    
    // Use in-memory database for browser
    window.HANZO_DB_BACKEND = 'memory'
    
    const client = new MemoryClient()
    
    // Store and search memories
    await client.remember({
      userid: 'browser-user',
      content: 'User clicked the help button',
    })
  </script>
</head>
</html>
```

## API Reference

### Memory Operations

```typescript
// Store a memory
await client.remember({
  userid: string
  projectid?: string
  content: string
  metadata?: Record<string, any>
  importance?: number // 0-10
  strip_pii?: boolean // Remove personally identifiable information
})

// Search memories
await client.search({
  userid: string
  projectid?: string
  query: string
  limit?: number
  filter_with_llm?: boolean // Use LLM to filter results
  additional_context?: string
})

// Get specific memory
await client.getMemory(userId, memoryId)

// Delete memory
await client.deleteMemory(userId, memoryId)

// Delete all user memories
await client.deleteUserMemories(userId)
```

### Project Management

```typescript
// Create project
await client.createProject({
  userId: string
  name: string
  description?: string
  metadata?: Record<string, any>
})

// Get user projects
await client.getUserProjects(userId)
```

### Knowledge Base

```typescript
// Create knowledge base
await client.createKnowledgeBase({
  projectId: string
  name: string
  description?: string
  metadata?: Record<string, any>
})

// Add fact
await client.addFact({
  knowledgeBaseId: string
  content: string
  metadata?: Record<string, any>
  confidence?: number // 0-1
})

// Search facts
await client.searchFacts({
  knowledgeBaseId: string
  query?: string
  limit?: number
})
```

### Chat History

```typescript
// Create chat session
await client.createChatSession({
  userId: string
  projectId: string
  metadata?: Record<string, any>
})

// Add message
await client.addChatMessage({
  sessionId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata?: Record<string, any>
})

// Get messages
await client.getChatMessages(sessionId, limit?)

// Search messages
await client.searchChatMessages({
  sessionId: string
  query: string
  limit?: number
})
```

## Database Backends

### LanceDB (Default)
- Works everywhere: Node.js, browsers (WASM), edge runtimes
- Persistent storage with efficient columnar format
- Native vector similarity search

### Memory (In-Memory)
- Perfect for testing and browser demos
- No persistence
- Fast for small datasets

## Embeddings

### Local Embeddings (Default)
Uses Transformers.js to run embedding models locally:
- No API keys required
- Privacy-friendly
- Works offline
- Models cached locally

### OpenAI Embeddings
Set `OPENAI_API_KEY` to use OpenAI's embedding models:
- Higher quality embeddings
- Faster for large batches
- Requires internet connection

## Examples

### React Application

```tsx
import { useState, useEffect } from 'react'
import { MemoryClient } from '@hanzo/memory'

function MemorySearch() {
  const [client] = useState(() => new MemoryClient())
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  
  const search = async () => {
    const memories = await client.search({
      userid: 'current-user',
      query,
      limit: 10,
    })
    setResults(memories)
  }
  
  return (
    <div>
      <input 
        value={query} 
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search memories..."
      />
      <button onClick={search}>Search</button>
      
      {results.map((memory) => (
        <div key={memory.memory_id}>
          <p>{memory.content}</p>
          <small>Score: {memory.similarity_score.toFixed(2)}</small>
        </div>
      ))}
    </div>
  )
}
```

### Edge Function

```typescript
export default {
  async fetch(request: Request) {
    const client = new MemoryClient()
    
    // Parse request
    const { userid, content } = await request.json()
    
    // Store memory
    const memory = await client.remember({
      userid,
      content,
      metadata: {
        ip: request.headers.get('CF-Connecting-IP'),
        timestamp: Date.now(),
      },
    })
    
    return Response.json({ memory })
  },
}
```

## License

BSD-3-Clause

## Contributing

See the [Python version](https://github.com/hanzoai/memory) for the reference implementation.