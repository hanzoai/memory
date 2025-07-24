import { EmbeddingService } from '../base'
import type { EmbeddingOptions, EmbeddingResult, BatchEmbeddingResult } from '../types'
import { spawn } from 'child_process'
import { promisify } from 'util'
import { exec as execCallback } from 'child_process'

const exec = promisify(execCallback)

/**
 * Candle-based embedding service using Rust with Metal acceleration on macOS
 * Requires candle-embeddings CLI to be installed
 */
export class CandleEmbeddingService extends EmbeddingService {
  private modelPath: string
  private useMetalAcceleration: boolean
  private ready = false
  
  constructor(options: EmbeddingOptions = {}) {
    super(options)
    this.modelPath = options.model || 'BAAI/bge-small-en-v1.5'
    // Automatically detect and use Metal on macOS
    this.useMetalAcceleration = process.platform === 'darwin'
  }
  
  async initialize(): Promise<void> {
    // Check if candle-embeddings is available
    try {
      await exec('candle-embeddings --version')
      this.ready = true
    } catch (error) {
      throw new Error('candle-embeddings CLI not found. Install with: cargo install candle-embeddings')
    }
  }
  
  async isReady(): Promise<boolean> {
    return this.ready
  }
  
  async embed(text: string): Promise<EmbeddingResult> {
    const startTime = Date.now()
    const env = { ...process.env }
    
    if (this.useMetalAcceleration) {
      env.CANDLE_METAL = '1'
    }
    
    try {
      // Use candle-embeddings CLI tool
      const { stdout } = await exec(
        `candle-embeddings encode --model ${this.modelPath} --text "${text.replace(/"/g, '\\"')}"`,
        { env, timeout: this.options.timeout }
      )
      
      // Parse the output (assuming JSON array format)
      const embedding = JSON.parse(stdout)
      
      return {
        embedding,
        latency: Date.now() - startTime,
        model: this.modelPath,
      }
    } catch (error) {
      throw new Error(`Candle embedding failed: ${error}`)
    }
  }
  
  async embedBatch(texts: string[]): Promise<BatchEmbeddingResult> {
    if (texts.length === 0) {
      return { embeddings: [], latency: 0 }
    }
    
    const startTime = Date.now()
    const env = { ...process.env }
    
    if (this.useMetalAcceleration) {
      env.CANDLE_METAL = '1'
    }
    
    try {
      // Create a temporary file with texts or use stdin
      const textsJson = JSON.stringify(texts)
      const { stdout } = await exec(
        `echo '${textsJson}' | candle-embeddings encode-batch --model ${this.modelPath}`,
        { env, timeout: this.options.timeout }
      )
      
      // Parse the output
      const embeddings = JSON.parse(stdout)
      
      return {
        embeddings,
        latency: Date.now() - startTime,
        model: this.modelPath,
      }
    } catch (error) {
      throw new Error(`Candle batch embedding failed: ${error}`)
    }
  }
  
  async dispose(): Promise<void> {
    this.ready = false
  }
  
  /**
   * Install Candle CLI
   */
  static async install(): Promise<void> {
    console.log('Installing Candle embeddings CLI...')
    try {
      await exec('cargo install candle-embeddings')
      console.log('Candle embeddings CLI installed successfully')
    } catch (error) {
      throw new Error(`Failed to install Candle: ${error}`)
    }
  }
}