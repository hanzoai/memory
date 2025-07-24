export abstract class EmbeddingService {
  abstract embed(text: string): Promise<number[]>
  abstract embedBatch(texts: string[]): Promise<number[][]>
  
  dimension: number
  
  constructor(dimension: number = 384) {
    this.dimension = dimension
  }
}