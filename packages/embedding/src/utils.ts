/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length')
  }
  
  let dotProduct = 0
  let normA = 0
  let normB = 0
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  
  normA = Math.sqrt(normA)
  normB = Math.sqrt(normB)
  
  if (normA === 0 || normB === 0) {
    return 0
  }
  
  return dotProduct / (normA * normB)
}

/**
 * Calculate euclidean distance between two vectors
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length')
  }
  
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i]
    sum += diff * diff
  }
  
  return Math.sqrt(sum)
}

/**
 * Normalize a vector to unit length
 */
export function normalize(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
  
  if (norm === 0) {
    return vector
  }
  
  return vector.map(val => val / norm)
}

/**
 * Find the k nearest neighbors from a set of embeddings
 */
export function findKNearest(
  query: number[],
  embeddings: number[][],
  k: number,
  metric: 'cosine' | 'euclidean' = 'cosine'
): Array<{ index: number; score: number }> {
  const scores = embeddings.map((embedding, index) => {
    const score = metric === 'cosine'
      ? cosineSimilarity(query, embedding)
      : -euclideanDistance(query, embedding) // Negative so higher is better
    
    return { index, score }
  })
  
  // Sort by score (descending)
  scores.sort((a, b) => b.score - a.score)
  
  return scores.slice(0, k)
}

/**
 * Batch process texts with progress callback
 */
export async function batchProcess<T>(
  items: T[],
  processor: (item: T) => Promise<any>,
  options: {
    batchSize?: number
    onProgress?: (processed: number, total: number) => void
  } = {}
): Promise<any[]> {
  const { batchSize = 10, onProgress } = options
  const results: any[] = []
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchResults = await Promise.all(batch.map(processor))
    results.push(...batchResults)
    
    if (onProgress) {
      onProgress(Math.min(i + batchSize, items.length), items.length)
    }
  }
  
  return results
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    initialDelay?: number
    maxDelay?: number
    factor?: number
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    factor = 2
  } = options
  
  let lastError: Error
  let delay = initialDelay
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      if (i < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay))
        delay = Math.min(delay * factor, maxDelay)
      }
    }
  }
  
  throw lastError!
}