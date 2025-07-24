# @hanzo/embedding

High-performance embedding service wrapper for TypeScript with support for multiple providers including OpenAI, Candle (Metal-accelerated), llama.cpp, ONNX Runtime, and Transformers.js.

## Features

- 🚀 **Multiple Providers**: OpenAI, Candle, llama.cpp, ONNX, Transformers.js
- 🔥 **High Performance**: Metal acceleration on macOS, GPU support
- 💾 **Built-in Caching**: Automatic caching for repeated embeddings
- 🔄 **Batch Processing**: Efficient batch embedding with concurrency control
- 📊 **Metrics**: Track performance, throughput, and cache hit rates
- 🛡️ **Type Safe**: Full TypeScript support with comprehensive types
- 🔧 **Extensible**: Easy to add new providers

## Installation

```bash
npm install @hanzo/embedding
```

## Quick Start

```typescript
import { EmbeddingFactory } from '@hanzo/embedding'

// Create an embedding service
const embedder = await EmbeddingFactory.create({
  provider: 'openai',
  options: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'text-embedding-3-small',
  }
})

// Generate a single embedding
const result = await embedder.embed('Hello, world!')
console.log(result.embedding) // [0.123, 0.456, ...]

// Generate batch embeddings
const batchResult = await embedder.embedBatch([
  'First text',
  'Second text',
  'Third text'
])
console.log(batchResult.embeddings) // [[...], [...], [...]]

// Get metrics
console.log(embedder.getMetrics())
// { cacheHits: 10, cacheMisses: 3, cacheHitRate: 0.77 }
```

## Providers

### OpenAI

```typescript
const embedder = await EmbeddingFactory.create({
  provider: 'openai',
  options: {
    apiKey: 'your-api-key',
    model: 'text-embedding-3-small', // or 'text-embedding-3-large'
    dimension: 1536, // optional, for dimensionality reduction
  }
})
```

### Candle (Metal-accelerated on macOS)

```typescript
const embedder = await EmbeddingFactory.create({
  provider: 'candle',
  options: {
    model: 'BAAI/bge-small-en-v1.5',
  }
})
```

Requires [candle-embeddings](https://github.com/huggingface/candle) CLI:
```bash
cargo install candle-embeddings
```

### llama.cpp

```typescript
const embedder = await EmbeddingFactory.create({
  provider: 'llama',
  options: {
    model: './models/nomic-embed-text-v1.5.f16.gguf',
    providerOptions: {
      llamaBinary: './llama',
      threads: 8,
      maxConcurrency: 4,
    }
  }
})
```

### ONNX Runtime

```typescript
const embedder = await EmbeddingFactory.create({
  provider: 'onnx',
  options: {
    model: 'all-MiniLM-L6-v2', // or path to .onnx file
  }
})
```

### Transformers.js

```typescript
const embedder = await EmbeddingFactory.create({
  provider: 'transformers',
  options: {
    model: 'Xenova/all-MiniLM-L6-v2',
  }
})
```

## Advanced Usage

### Custom Embedding Service

```typescript
import { EmbeddingService, EmbeddingResult } from '@hanzo/embedding'

class CustomEmbeddingService extends EmbeddingService {
  async initialize(): Promise<void> {
    // Initialize your model
  }
  
  async embed(text: string): Promise<EmbeddingResult> {
    // Generate embedding
    return {
      embedding: [/* your embedding */],
      latency: 100,
      model: 'custom-model',
    }
  }
  
  async embedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
    // Batch processing
  }
  
  async isReady(): Promise<boolean> {
    return true
  }
  
  async dispose(): Promise<void> {
    // Cleanup
  }
}
```

### Utilities

```typescript
import { cosineSimilarity, findKNearest } from '@hanzo/embedding'

// Calculate similarity
const similarity = cosineSimilarity(embedding1, embedding2)

// Find k nearest neighbors
const nearest = findKNearest(queryEmbedding, embeddings, 5)
// [{ index: 0, score: 0.95 }, { index: 3, score: 0.87 }, ...]
```

### Batch Processing with Progress

```typescript
import { batchProcess } from '@hanzo/embedding'

const embeddings = await batchProcess(
  texts,
  text => embedder.embed(text),
  {
    batchSize: 20,
    onProgress: (processed, total) => {
      console.log(`Progress: ${processed}/${total}`)
    }
  }
)
```

## Benchmarking

Run benchmarks to compare providers:

```bash
npm run bench
```

## Performance Tips

1. **Use Caching**: The OpenAI, ONNX, and Transformers providers include automatic caching
2. **Batch Processing**: Process multiple texts at once for better throughput
3. **Provider Selection**:
   - **OpenAI**: Best quality, requires API key
   - **Candle**: Best local performance on macOS with Metal
   - **llama.cpp**: Good cross-platform local option
   - **ONNX**: Fast CPU inference
   - **Transformers.js**: Works in browsers

## License

BSD-3-Clause