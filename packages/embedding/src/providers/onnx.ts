import { CachedEmbeddingService } from '../base'
import type { EmbeddingOptions, EmbeddingResult, BatchEmbeddingResult } from '../types'

/**
 * ONNX Runtime embedding service
 * Supports various embedding models in ONNX format
 */
export class ONNXEmbeddingService extends CachedEmbeddingService {
  private session: any = null
  private tokenizer: any = null
  private modelPath: string
  
  constructor(options: EmbeddingOptions = {}) {
    super(options)
    this.modelPath = options.model || 'all-MiniLM-L6-v2'
  }
  
  async initialize(): Promise<void> {
    try {
      // Dynamic import to avoid loading if not needed
      const ort = await import('onnxruntime-node')
      
      // Load model from path or URL
      const modelUrl = this.modelPath.includes('/') 
        ? this.modelPath 
        : `https://huggingface.co/Xenova/${this.modelPath}/resolve/main/onnx/model.onnx`
      
      this.session = await ort.InferenceSession.create(modelUrl, {
        executionProviders: ['CPU'], // Can add 'CUDA', 'CoreML', etc.
        graphOptimizationLevel: 'all',
      })
      
      // TODO: Initialize tokenizer
      // For now, we'll use a simple whitespace tokenizer
      this.tokenizer = {
        encode: (text: string) => {
          // Simple tokenization - in production, use proper tokenizer
          const tokens = text.toLowerCase().split(/\s+/)
          // Convert to token IDs (mock implementation)
          return tokens.map(token => 
            token.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 30000
          )
        }
      }
    } catch (error) {
      throw new Error(`Failed to initialize ONNX model: ${error}`)
    }
  }
  
  async isReady(): Promise<boolean> {
    return !!this.session
  }
  
  protected async embedUncached(text: string): Promise<EmbeddingResult> {
    const startTime = Date.now()
    
    if (!this.session) {
      throw new Error('ONNX session not initialized')
    }
    
    // Tokenize input
    const inputIds = this.tokenizer.encode(text)
    const attentionMask = new Array(inputIds.length).fill(1)
    
    // Prepare tensors
    const ort = await import('onnxruntime-node')
    const inputIdsTensor = new ort.Tensor('int64', BigInt64Array.from(inputIds.map(BigInt)), [1, inputIds.length])
    const attentionMaskTensor = new ort.Tensor('int64', BigInt64Array.from(attentionMask.map(BigInt)), [1, attentionMask.length])
    
    // Run inference
    const feeds = {
      input_ids: inputIdsTensor,
      attention_mask: attentionMaskTensor,
    }
    
    const results = await this.session.run(feeds)
    
    // Extract embeddings (usually from pooler_output or last_hidden_state with mean pooling)
    let embedding: number[]
    if (results.pooler_output) {
      embedding = Array.from(results.pooler_output.data as Float32Array)
    } else if (results.last_hidden_state) {
      // Mean pooling over sequence dimension
      const data = results.last_hidden_state.data as Float32Array
      const seqLen = results.last_hidden_state.dims[1]
      const hiddenSize = results.last_hidden_state.dims[2]
      
      embedding = new Array(hiddenSize).fill(0)
      for (let i = 0; i < seqLen; i++) {
        for (let j = 0; j < hiddenSize; j++) {
          embedding[j] += data[i * hiddenSize + j]
        }
      }
      embedding = embedding.map(v => v / seqLen)
    } else {
      throw new Error('No suitable output found in ONNX model')
    }
    
    // Normalize embedding
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
    embedding = embedding.map(v => v / norm)
    
    return {
      embedding,
      latency: Date.now() - startTime,
      model: this.modelPath,
      tokens: inputIds.length,
    }
  }
  
  protected async embedBatchUncached(texts: string[]): Promise<BatchEmbeddingResult> {
    // For simplicity, process sequentially
    // In production, could batch process if model supports it
    const startTime = Date.now()
    const results = await Promise.all(texts.map(text => this.embedUncached(text)))
    
    return {
      embeddings: results.map(r => r.embedding),
      latency: Date.now() - startTime,
      model: this.modelPath,
      totalTokens: results.reduce((sum, r) => sum + (r.tokens || 0), 0),
    }
  }
  
  async dispose(): Promise<void> {
    if (this.session) {
      await this.session.release()
      this.session = null
    }
    this.tokenizer = null
    this.clearCache()
  }
}