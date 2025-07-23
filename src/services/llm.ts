import OpenAI from 'openai'
import { config } from '../config'

export abstract class LLMService {
  abstract complete(prompt: string, system?: string): Promise<string>
  abstract stripPII(text: string): Promise<string>
  abstract filterResults(query: string, results: any[], context?: string): Promise<any[]>
}

export class OpenAILLMService extends LLMService {
  private client: OpenAI
  private model: string
  
  constructor(apiKey?: string, model?: string) {
    super()
    
    if (!apiKey && !config.openaiApiKey) {
      throw new Error('OpenAI API key required for LLM service')
    }
    
    this.client = new OpenAI({
      apiKey: apiKey || config.openaiApiKey,
    })
    
    this.model = model || config.openaiModel
  }
  
  async complete(prompt: string, system?: string): Promise<string> {
    const messages: any[] = []
    
    if (system) {
      messages.push({ role: 'system', content: system })
    }
    
    messages.push({ role: 'user', content: prompt })
    
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: 0.7,
      max_tokens: 1000,
    })
    
    return response.choices[0].message.content || ''
  }
  
  async stripPII(text: string): Promise<string> {
    const system = `You are a PII removal assistant. Remove any personally identifiable information from the text while preserving the general meaning and context. Replace PII with generic placeholders like [NAME], [EMAIL], [PHONE], etc.`
    
    const prompt = `Remove PII from the following text:\n\n${text}`
    
    return this.complete(prompt, system)
  }
  
  async filterResults(query: string, results: any[], context?: string): Promise<any[]> {
    if (results.length === 0) return []
    
    const system = `You are a search result relevance filter. Given a query and search results, identify which results are actually relevant to the query. Return only the indices of relevant results as a JSON array.`
    
    const resultsText = results.map((r, i) => `[${i}] ${r.content}`).join('\n\n')
    
    let prompt = `Query: ${query}\n\n`
    if (context) {
      prompt += `Additional Context: ${context}\n\n`
    }
    prompt += `Search Results:\n${resultsText}\n\nReturn the indices of relevant results as a JSON array (e.g., [0, 2, 3]):`
    
    const response = await this.complete(prompt, system)
    
    try {
      const indices = JSON.parse(response)
      if (Array.isArray(indices)) {
        return indices
          .filter(i => typeof i === 'number' && i >= 0 && i < results.length)
          .map(i => results[i])
      }
    } catch {
      // If parsing fails, return all results
    }
    
    return results
  }
}

export class MockLLMService extends LLMService {
  async complete(prompt: string, system?: string): Promise<string> {
    return `Mock response to: ${prompt}`
  }
  
  async stripPII(text: string): Promise<string> {
    // Simple regex-based PII removal
    return text
      .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '[NAME]')
      .replace(/\b[\w._%+-]+@[\w.-]+\.[A-Z|a-z]{2,}\b/gi, '[EMAIL]')
      .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]')
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]')
  }
  
  async filterResults(query: string, results: any[], context?: string): Promise<any[]> {
    // Simple keyword matching
    const queryWords = query.toLowerCase().split(/\s+/)
    
    return results.filter(r => {
      const content = r.content.toLowerCase()
      return queryWords.some(word => content.includes(word))
    })
  }
}

let llmService: LLMService | null = null

export function getLLMService(): LLMService {
  if (!llmService) {
    if (config.openaiApiKey) {
      llmService = new OpenAILLMService()
    } else {
      llmService = new MockLLMService()
    }
  }
  return llmService
}

export function setLLMService(service: LLMService): void {
  llmService = service
}