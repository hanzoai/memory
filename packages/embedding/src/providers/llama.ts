import { EmbeddingService } from '../base'
import type { EmbeddingOptions, EmbeddingResult, BatchEmbeddingResult } from '../types'
import { spawn } from 'child_process'

/**
 * llama.cpp-based embedding service
 * Requires llama.cpp to be compiled with embedding support
 */
export class LlamaCppEmbeddingService extends EmbeddingService {
  private modelPath: string
  private llamaBinary: string
  private threads: number
  private ready = false
  
  constructor(options: EmbeddingOptions = {}) {
    super(options)
    this.modelPath = options.model || './models/nomic-embed-text-v1.5.f16.gguf'
    this.llamaBinary = options.providerOptions?.llamaBinary || './llama'
    this.threads = options.providerOptions?.threads || 4
    
    // Set dimension based on model
    if (this.modelPath.includes('nomic-embed')) {
      this.dimension = options.dimension ?? 768
    }
  }
  
  async initialize(): Promise<void> {
    // Check if llama binary exists and supports embeddings
    const isAvailable = await this.checkAvailability()
    if (!isAvailable) {
      throw new Error('llama.cpp not found or does not support embeddings')
    }
    this.ready = true
  }
  
  async isReady(): Promise<boolean> {
    return this.ready
  }
  
  private async checkAvailability(): Promise<boolean> {
    return new Promise((resolve) => {
      const child = spawn(this.llamaBinary, ['--help'])
      
      let output = ''
      child.stdout.on('data', (data) => {
        output += data.toString()
      })
      
      child.on('close', (code) => {
        // Check if --embedding flag is supported
        resolve(code === 0 && output.includes('--embedding'))
      })
      
      child.on('error', () => {
        resolve(false)
      })
    })
  }
  
  async embed(text: string): Promise<EmbeddingResult> {
    const startTime = Date.now()
    
    return new Promise((resolve, reject) => {
      const args = [
        '-m', this.modelPath,
        '-p', text,
        '--embedding',  // Enable embedding mode
        '-t', this.threads.toString(),
        '--no-display-prompt',
        '--log-disable'
      ]
      
      const child = spawn(this.llamaBinary, args, {
        timeout: this.options.timeout
      })
      
      let output = ''
      let error = ''
      
      child.stdout.on('data', (data) => {
        output += data.toString()
      })
      
      child.stderr.on('data', (data) => {
        error += data.toString()
      })
      
      child.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`llama.cpp exited with code ${code}: ${error}`))
        } else {
          try {
            // Parse embedding output
            // llama.cpp outputs embeddings as space-separated floats
            const lines = output.trim().split('\n')
            const embeddingLine = lines.find(line => line.includes('[') && line.includes(']'))
            
            let embedding: number[]
            if (embeddingLine) {
              embedding = JSON.parse(embeddingLine)
            } else {
              // Alternative parsing for different output formats
              const values = output.trim().split(/\s+/).map(parseFloat).filter(n => !isNaN(n))
              if (values.length === this.dimension) {
                embedding = values
              } else {
                throw new Error('Failed to parse embedding output')
              }
            }
            
            resolve({
              embedding,
              latency: Date.now() - startTime,
              model: this.modelPath,
            })
          } catch (error) {
            reject(new Error(`Failed to parse embedding: ${error}`))
          }
        }
      })
    })
  }
  
  async embedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
    // llama.cpp doesn't natively support batch embeddings,
    // so we'll process them with concurrency control
    const startTime = Date.now()
    const maxConcurrency = this.options.providerOptions?.maxConcurrency || 4
    
    const results: EmbeddingResult[] = new Array(texts.length)
    const queue = texts.map((text, index) => ({ text, index }))
    
    const workers = Array(Math.min(maxConcurrency, texts.length)).fill(null).map(async () => {
      while (queue.length > 0) {
        const item = queue.shift()
        if (!item) break
        
        const result = await this.embed(item.text)
        results[item.index] = result
      }
    })
    
    await Promise.all(workers)
    
    return {
      embeddings: results.map(r => r.embedding),
      latency: Date.now() - startTime,
      model: this.modelPath,
      totalTokens: results.reduce((sum, r) => sum + (r.tokens || 0), 0),
    }
  }
  
  async dispose(): Promise<void> {
    this.ready = false
  }
  
  /**
   * Download and set up a model for embeddings
   */
  static async downloadModel(modelUrl: string, outputPath: string): Promise<void> {
    const { exec } = await import('child_process')
    const { promisify } = await import('util')
    const execAsync = promisify(exec)
    
    console.log(`Downloading embedding model from ${modelUrl}...`)
    await execAsync(`wget -O ${outputPath} ${modelUrl}`)
    console.log('Model downloaded successfully')
  }
}