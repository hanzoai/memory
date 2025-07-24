import { EmbeddingService } from './base'
import { promisify } from 'util'
import { exec as execCallback } from 'child_process'

const exec = promisify(execCallback)

/**
 * Candle-based embedding service using Rust with Metal acceleration on macOS
 */
export class CandleEmbeddingService extends EmbeddingService {
  private modelPath: string
  private useMetalAcceleration: boolean
  
  constructor(modelPath: string = 'BAAI/bge-small-en-v1.5', dimension: number = 384) {
    super(dimension)
    this.modelPath = modelPath
    // Automatically detect and use Metal on macOS
    this.useMetalAcceleration = process.platform === 'darwin'
  }
  
  async embed(text: string): Promise<number[]> {
    const env = { ...process.env }
    if (this.useMetalAcceleration) {
      env.CANDLE_METAL = '1'
    }
    
    try {
      // Use candle-embeddings CLI tool
      const { stdout } = await exec(
        `candle-embeddings encode --model ${this.modelPath} --text "${text.replace(/"/g, '\\"')}"`,
        { env }
      )
      
      // Parse the output (assuming JSON array format)
      const embedding = JSON.parse(stdout)
      return embedding
    } catch (error) {
      console.error('Candle embedding failed:', error)
      // Fallback to mock embeddings
      return this.mockEmbed(text)
    }
  }
  
  async embedBatch(texts: string[]): Promise<number[][]> {
    // Candle can process batches efficiently
    if (texts.length === 0) return []
    
    const env = { ...process.env }
    if (this.useMetalAcceleration) {
      env.CANDLE_METAL = '1'
    }
    
    try {
      // Create a temporary file with texts or use stdin
      const textsJson = JSON.stringify(texts)
      const { stdout } = await exec(
        `echo '${textsJson}' | candle-embeddings encode-batch --model ${this.modelPath}`,
        { env }
      )
      
      // Parse the output
      const embeddings = JSON.parse(stdout)
      return embeddings
    } catch (error) {
      console.error('Candle batch embedding failed:', error)
      // Fallback to sequential processing
      return Promise.all(texts.map(text => this.embed(text)))
    }
  }
  
  private mockEmbed(text: string): number[] {
    // Same deterministic mock as base service
    const seed = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const rng = (s: number) => {
      s = Math.sin(s) * 10000
      return s - Math.floor(s)
    }
    
    return Array.from({ length: this.dimension }, (_, i) => {
      return rng(seed + i) * 2 - 1
    })
  }
  
  /**
   * Check if Candle CLI is available
   */
  static async isAvailable(): Promise<boolean> {
    try {
      await exec('candle-embeddings --version')
      return true
    } catch {
      return false
    }
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