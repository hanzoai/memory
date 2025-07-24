declare module '@xenova/transformers' {
  export interface Env {
    allowLocalModels: boolean
    useBrowserCache: boolean
  }
  
  export const env: Env
  
  export function pipeline(task: string, model: string): Promise<any>
}