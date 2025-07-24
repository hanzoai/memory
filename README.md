# @hanzo/memory

AI memory service with LanceDB - TypeScript/JavaScript port of the Python memory service.

## Features

- **Multiple Backend Support**: LanceDB (default) or in-memory database
- **Embedding Generation**: 
  - Mock (default, no dependencies)
  - OpenAI (API)
  - ONNX Runtime (local, cross-platform)
  - Transformers.js (local, requires sharp)
  - Candle (Rust, Metal-accelerated on macOS)
  - llama.cpp (C++, cross-platform)
- **LLM Integration**: Optional PII stripping and result filtering
- **REST API**: FastAPI-compatible endpoints
- **TypeScript Client**: Type-safe client for all operations
- **Full Feature Parity**: Complete port of Python version
- **macOS Friendly**: No sharp module dependencies by default
- **Benchmarking Suite**: Performance testing for all backends
- **CI/CD**: Automated testing across Linux and macOS

## Installation

```bash
npm install @hanzo/memory
```

## Usage

### As a Library

```typescript
import { MemoryClient } from '@hanzo/memory'

const client = new MemoryClient()

// Remember information
const memory = await client.remember({
  userid: 'user-123',
  content: 'User prefers dark mode',
  importance: 8
})

// Search memories
const results = await client.search({
  userid: 'user-123',
  query: 'What are the user preferences?',
  limit: 5
})
```

### As a Server

```bash
# Start the server
npm run server

# Or in development mode with auto-reload
npm run server:dev
```

The server runs on port 8000 by default.

## Configuration

Configure via environment variables:

```bash
# Database backend
DB_BACKEND=lancedb  # or 'memory' for in-memory

# LanceDB settings
LANCEDB_URI=./lancedb_data
LANCEDB_API_KEY=your-api-key  # optional

# Embedding provider
EMBEDDING_PROVIDER=mock  # or 'openai', 'onnx', 'transformers', 'candle', 'llama' 
EMBEDDING_MODEL=Xenova/all-MiniLM-L6-v2

# OpenAI settings (if using OpenAI)
OPENAI_API_KEY=your-openai-key
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Service settings
STRIP_PII_DEFAULT=false
FILTER_WITH_LLM_DEFAULT=false
```

## API Endpoints

### Health Check
- `GET /health` - Service health status

### Memory Operations
- `POST /v1/remember` - Store a memory
- `POST /v1/memories/add` - Add memory (alias)
- `POST /v1/memories/get` - Get specific memory
- `POST /v1/memories/search` - Search memories
- `DELETE /v1/memories` - Delete specific memory
- `POST /v1/memories/delete` - Delete memory (RPC-style)
- `POST /v1/user/delete` - Delete all user data

### Project Management
- `POST /v1/project/create` - Create project
- `GET /v1/projects` - List user projects

### Knowledge Base
- `POST /v1/kb/create` - Create knowledge base
- `GET /v1/kb/list` - List knowledge bases
- `POST /v1/kb/facts/add` - Add fact
- `POST /v1/kb/facts/get` - Search facts
- `POST /v1/kb/facts/delete` - Delete facts

### Chat Sessions
- `POST /v1/chat/sessions/create` - Create session
- `POST /v1/chat/messages/add` - Add message
- `GET /v1/chat/sessions/:session_id/messages` - Get messages
- `POST /v1/chat/search` - Search messages

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run specific test suite
npm test -- tests/unit
npm test -- tests/integration

# Run benchmarks
npm run bench

# Run specific benchmarks
BENCHMARK_LLAMA_CPP=true npm run bench benchmarks/inference.bench.ts
BENCHMARK_CANDLE=true npm run bench benchmarks/embeddings.bench.ts

# Build
npm run build

# Lint & format
npm run lint
npm run format

# Type checking
npm run typecheck

# Docker operations
docker-compose up memory-server    # Run production server
docker-compose up memory-test      # Run tests in Docker
docker-compose up memory-benchmark # Run benchmarks in Docker
docker-compose up memory-dev       # Development with auto-reload
```

## Test Status

- ✅ Unit Tests: All passing (92/92)
  - Models validation
  - Configuration loading
  - Database implementations
  - Embedding services (including Mock)
  - LLM services
  - Memory service

- ✅ Integration Tests: All passing (18/18)
  - Project operations
  - Memory operations
  - Knowledge base operations
  - Chat operations

## Architecture

### Database Backends

1. **LanceDB** (Default)
   - High-performance vector database
   - Supports billion-scale vectors
   - S3-compatible storage
   - Full-text search capabilities

2. **Memory** (Testing)
   - In-memory implementation
   - Perfect for testing
   - No external dependencies

### Services

1. **EmbeddingService**
   - MockEmbeddingService (default, no dependencies)
   - OpenAIEmbeddingService (API)
   - ONNXEmbeddingService (local, ONNX Runtime)
   - TransformersEmbeddingService (local, requires @xenova/transformers)
   - CandleEmbeddingService (Rust-based, Metal acceleration on macOS)
   - LlamaCppEmbeddingService (C++, uses llama.cpp)

2. **LLMService**
   - OpenAILLMService (API)
   - MockLLMService (testing)

3. **MemoryService**
   - Core business logic
   - Handles all memory operations

## Differences from Python Version

- TypeScript/JavaScript implementation
- Uses Fastify instead of FastAPI
- Dynamic imports for optional dependencies
- Zod for runtime type validation
- Vitest for testing framework

## License

BSD-3-Clause

## Contributing

Contributions welcome! Please ensure all tests pass before submitting PRs.

## Solutions for macOS

The TypeScript version defaults to MockEmbeddingService to avoid the sharp module dependency issue from @xenova/transformers. For production use:

1. **Use OpenAI Embeddings** (Recommended for production):
   ```bash
   EMBEDDING_PROVIDER=openai OPENAI_API_KEY=your-key npm run server
   ```

2. **Use Mock Embeddings** (Default, good for development):
   ```bash
   npm run server  # Uses mock embeddings by default
   ```

3. **Use ONNX Runtime** (Future option for local embeddings):
   - Currently returns mock embeddings
   - Full ONNX model support planned

4. **Use Transformers.js** (If you need it and can install sharp):
   ```bash
   EMBEDDING_PROVIDER=transformers npm run server
   ```

5. **Use Candle** (Metal-accelerated on macOS):
   ```bash
   # Install Rust and Candle CLI first
   cargo install candle-embeddings
   EMBEDDING_PROVIDER=candle npm run server
   ```

6. **Use llama.cpp** (Cross-platform local embeddings):
   ```bash
   # Build llama.cpp first
   git clone https://github.com/hanzoai/llama.cpp.git
   cd llama.cpp && make
   # Download an embedding model
   wget https://huggingface.co/nomic-ai/nomic-embed-text-v1.5-GGUF/resolve/main/nomic-embed-text-v1.5.f16.gguf
   EMBEDDING_PROVIDER=llama LLAMA_EMBEDDING_MODEL=./nomic-embed-text-v1.5.f16.gguf npm run server
   ```

## Benchmarking

The project includes comprehensive benchmarks for embedding and inference providers:

### Embedding Benchmarks

Compare performance across all embedding providers:

```bash
# Run all embedding benchmarks
npm run bench benchmarks/embeddings.bench.ts

# Run specific provider benchmarks
BENCHMARK_CANDLE=true npm run bench
BENCHMARK_LLAMA_CPP=true LLAMA_EMBEDDING_MODEL=./models/nomic-embed-text-v1.5.f16.gguf npm run bench
```

### Inference Benchmarks

Test LLM inference performance:

```bash
# Run inference benchmarks
BENCHMARK_LLAMA_CPP=true npm run bench benchmarks/inference.bench.ts
BENCHMARK_CANDLE=true npm run bench benchmarks/inference.bench.ts
BENCHMARK_MLX=true npm run bench benchmarks/inference.bench.ts  # macOS only
```

### CI/CD

The project includes GitHub Actions workflows for:

- **Cross-platform testing**: Linux and macOS
- **Matrix testing**: All embedding providers
- **Benchmark tracking**: Performance regression detection
- **Docker builds**: Multi-stage builds for different environments

## Notes

- **Vite CJS deprecation warning**: This is a warning from Vitest and doesn't affect functionality.