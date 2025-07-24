import { EmbeddingService } from './base'
import { spawn } from 'child_process'

/**
 * llama.cpp-based embedding service
 * Requires llama.cpp to be compiled with embedding support
 */
export class LlamaCppEmbeddingService extends EmbeddingService {
  private modelPath: string
  private llamaBinary: string
  private threads: number
  
  constructor(
    modelPath: string = './models/nomic-embed-text-v1.5.f16.gguf',
    dimension: number = 768,
    llamaBinary: string = './llama',
    threads: number = 4
  ) {
    super(dimension)
    this.modelPath = modelPath
    this.llamaBinary = llamaBinary
    this.threads = threads
  }
  
  async embed(text: string): Promise<number[]> {
    return new Promise((resolve, reject) => {
      const args = [
        '-m', this.modelPath,
        '-p', text,
        '--embedding',  // Enable embedding mode
        '-t', this.threads.toString(),
        '--no-display-prompt',
        '--log-disable'
      ]
      
      const child = spawn(this.llamaBinary, args)
      
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
            
            if (embeddingLine) {
              const embedding = JSON.parse(embeddingLine)
              resolve(embedding)
            } else {
              // Alternative parsing for different output formats
              const values = output.trim().split(/\s+/).map(parseFloat).filter(n => !isNaN(n))
              if (values.length === this.dimension) {
                resolve(values)
              } else {
                reject(new Error('Failed to parse embedding output'))
              }
            }
          } catch (error) {
            reject(new Error(`Failed to parse embedding: ${error}`))
          }
        }
      })
    })
  }
  
  async embedBatch(texts: string[]): Promise<number[][]> {
    // llama.cpp doesn't natively support batch embeddings,
    // so we'll process them sequentially
    // For better performance, consider using multiple processes
    const embeddings: number[][] = []
    
    for (const text of texts) {
      const embedding = await this.embed(text)
      embeddings.push(embedding)
    }
    
    return embeddings
  }
  
  /**
   * Check if llama.cpp is available and supports embeddings
   */
  static async isAvailable(llamaBinary: string = './llama'): Promise<boolean> {
    return new Promise((resolve) => {
      const child = spawn(llamaBinary, ['--help'])
      
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

/**
 * Optimized batch embedding service using llama.cpp with parallel processing
 */
export class LlamaCppBatchEmbeddingService extends LlamaCppEmbeddingService {
  private maxConcurrency: number
  
  constructor(
    modelPath: string = './models/nomic-embed-text-v1.5.f16.gguf',
    dimension: number = 768,
    llamaBinary: string = './llama',
    threads: number = 4,
    maxConcurrency: number = 4
  ) {
    super(modelPath, dimension, llamaBinary, threads)
    this.maxConcurrency = maxConcurrency
  }
  
  async embedBatch(texts: string[]): Promise<number[][]> {
    // Process in parallel with concurrency limit
    const results: number[][] = new Array(texts.length)
    const queue = texts.map((text, index) => ({ text, index }))
    
    const workers = Array(Math.min(this.maxConcurrency, texts.length)).fill(null).map(async () => {
      while (queue.length > 0) {
        const item = queue.shift()
        if (!item) break
        
        const embedding = await this.embed(item.text)
        results[item.index] = embedding
      }
    })
    
    await Promise.all(workers)
    return results
  }
}