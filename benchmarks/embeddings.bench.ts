import { bench, describe, beforeAll } from 'vitest'
import {
  MockEmbeddingService,
  OpenAIEmbeddingService,
  ONNXEmbeddingService,
  TransformersEmbeddingService,
  CandleEmbeddingService,
  LlamaCppEmbeddingService,
  setEmbeddingService,
} from '../src/services/embeddings'
import { config } from '../src/config'

// Sample texts for benchmarking
const SAMPLE_TEXTS = [
  'The quick brown fox jumps over the lazy dog',
  'Machine learning is transforming how we interact with technology',
  'TypeScript provides static typing for JavaScript applications',
  'Vector databases enable semantic search at scale',
  'Natural language processing has made significant advances',
]

const BATCH_SIZES = [1, 5, 10, 25, 50]

describe('Embedding Service Benchmarks', () => {
  describe('MockEmbeddingService', () => {
    const service = new MockEmbeddingService()
    
    bench('single embedding', async () => {
      await service.embed(SAMPLE_TEXTS[0])
    })
    
    BATCH_SIZES.forEach(size => {
      bench(`batch embedding (${size} texts)`, async () => {
        await service.embedBatch(SAMPLE_TEXTS.slice(0, size))
      })
    })
  })
  
  // Only run if OpenAI API key is available
  if (process.env.OPENAI_API_KEY) {
    describe('OpenAIEmbeddingService', () => {
      const service = new OpenAIEmbeddingService()
      
      bench('single embedding', async () => {
        await service.embed(SAMPLE_TEXTS[0])
      }, { timeout: 10000 })
      
      BATCH_SIZES.forEach(size => {
        bench(`batch embedding (${size} texts)`, async () => {
          await service.embedBatch(SAMPLE_TEXTS.slice(0, size))
        }, { timeout: 30000 })
      })
    })
  }
  
  describe('ONNXEmbeddingService', () => {
    const service = new ONNXEmbeddingService()
    
    bench('single embedding (mock)', async () => {
      await service.embed(SAMPLE_TEXTS[0])
    })
    
    bench('batch embedding (5 texts, mock)', async () => {
      await service.embedBatch(SAMPLE_TEXTS)
    })
  })
  
  // Only run if we can import transformers (will fail on systems without sharp)
  if (process.env.TEST_TRANSFORMERS === 'true') {
    describe('TransformersEmbeddingService', () => {
      let service: TransformersEmbeddingService
      
      beforeAll(async () => {
        service = new TransformersEmbeddingService()
        // Pre-load the model
        await service.embed('warmup')
      })
      
      bench('single embedding', async () => {
        await service.embed(SAMPLE_TEXTS[0])
      })
      
      BATCH_SIZES.forEach(size => {
        bench(`batch embedding (${size} texts)`, async () => {
          await service.embedBatch(SAMPLE_TEXTS.slice(0, size))
        })
      })
    })
  }
})

// Memory usage benchmark
describe('Memory Usage', () => {
  bench('MockEmbeddingService memory', async () => {
    const service = new MockEmbeddingService()
    const iterations = 100
    
    for (let i = 0; i < iterations; i++) {
      await service.embed(`Test text ${i}`)
    }
  })
  
  bench('Embedding dimension impact', async () => {
    const dimensions = [128, 256, 384, 512, 768, 1024]
    
    for (const dim of dimensions) {
      const service = new MockEmbeddingService(dim)
      await service.embedBatch(SAMPLE_TEXTS)
    }
  })
})

// Candle embeddings benchmark (Metal-accelerated on macOS)
if (process.env.BENCHMARK_CANDLE === 'true') {
  describe('CandleEmbeddingService', () => {
    const service = new CandleEmbeddingService()
    
    bench('single embedding', async () => {
      await service.embed(SAMPLE_TEXTS[0])
    }, { timeout: 10000 })
    
    BATCH_SIZES.forEach(size => {
      bench(`batch embedding (${size} texts)`, async () => {
        await service.embedBatch(SAMPLE_TEXTS.slice(0, size))
      }, { timeout: 30000 })
    })
    
    if (process.platform === 'darwin') {
      bench('Metal-accelerated embedding', async () => {
        // Candle automatically uses Metal on macOS
        await service.embed(SAMPLE_TEXTS[0])
      }, { timeout: 10000 })
    }
  })
}

// llama.cpp embeddings benchmark
if (process.env.BENCHMARK_LLAMA_CPP === 'true') {
  describe('LlamaCppEmbeddingService', () => {
    const modelPath = process.env.LLAMA_EMBEDDING_MODEL || './models/nomic-embed-text-v1.5.f16.gguf'
    const service = new LlamaCppEmbeddingService(modelPath)
    
    bench('single embedding', async () => {
      await service.embed(SAMPLE_TEXTS[0])
    }, { timeout: 10000 })
    
    BATCH_SIZES.forEach(size => {
      bench(`batch embedding (${size} texts)`, async () => {
        await service.embedBatch(SAMPLE_TEXTS.slice(0, size))
      }, { timeout: 30000 })
    })
  })
}