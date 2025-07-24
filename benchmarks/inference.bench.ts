import { bench, describe } from 'vitest'
import { spawn } from 'child_process'
import { promisify } from 'util'
import { exec as execCallback } from 'child_process'

const exec = promisify(execCallback)

// Sample prompts for benchmarking
const SAMPLE_PROMPTS = [
  'What is machine learning?',
  'Explain how vector databases work in simple terms.',
  'Write a TypeScript function to calculate fibonacci numbers.',
  'What are the benefits of using embeddings for semantic search?',
  'How does transformer architecture work in neural networks?',
]

const BATCH_SIZES = [1, 5, 10]

// Helper to run llama.cpp inference
async function runLlamaCpp(prompt: string, modelPath: string): Promise<{ text: string; time: number }> {
  const startTime = Date.now()
  
  return new Promise((resolve, reject) => {
    const child = spawn('./llama', [
      '-m', modelPath,
      '-p', prompt,
      '-n', '128',  // max tokens
      '-t', '4',    // threads
      '--temp', '0.7',
      '--no-display-prompt'
    ])
    
    let output = ''
    let error = ''
    
    child.stdout.on('data', (data) => {
      output += data.toString()
    })
    
    child.stderr.on('data', (data) => {
      error += data.toString()
    })
    
    child.on('close', (code) => {
      const time = Date.now() - startTime
      if (code !== 0) {
        reject(new Error(`llama.cpp exited with code ${code}: ${error}`))
      } else {
        resolve({ text: output.trim(), time })
      }
    })
  })
}

// Helper to run Candle inference (via Python binding or Rust binary)
async function runCandle(prompt: string, modelPath: string): Promise<{ text: string; time: number }> {
  const startTime = Date.now()
  
  try {
    // Assuming we have a candle CLI tool installed
    const { stdout } = await exec(`candle-cli generate --model ${modelPath} --prompt "${prompt}" --max-tokens 128`)
    const time = Date.now() - startTime
    return { text: stdout.trim(), time }
  } catch (error) {
    throw new Error(`Candle inference failed: ${error}`)
  }
}

// Helper for ONNX Runtime inference
async function runONNXInference(prompt: string): Promise<{ text: string; time: number }> {
  const startTime = Date.now()
  
  try {
    // Import dynamically to avoid loading if not needed
    const { InferenceSession } = await import('onnxruntime-node')
    
    // This is a simplified example - real implementation would need tokenization, etc.
    const session = await InferenceSession.create('./models/t5-small.onnx')
    
    // Mock tokenization (real implementation would use proper tokenizer)
    const inputIds = new Int32Array([1, 2, 3, 4, 5]) // mock tokens
    const attentionMask = new Int32Array([1, 1, 1, 1, 1])
    
    const feeds = {
      input_ids: inputIds,
      attention_mask: attentionMask,
    }
    
    const results = await session.run(feeds)
    const time = Date.now() - startTime
    
    // Mock decoding (real implementation would decode tokens to text)
    return { text: `Mock ONNX output for: ${prompt.substring(0, 20)}...`, time }
  } catch (error) {
    throw new Error(`ONNX inference failed: ${error}`)
  }
}

// Metal-accelerated inference via MLX (macOS only)
async function runMLXInference(prompt: string): Promise<{ text: string; time: number }> {
  const startTime = Date.now()
  
  try {
    // MLX CLI command (assuming mlx-lm is installed)
    const { stdout } = await exec(`mlx_lm.generate --model microsoft/phi-2 --prompt "${prompt}" --max-tokens 128`)
    const time = Date.now() - startTime
    return { text: stdout.trim(), time }
  } catch (error) {
    throw new Error(`MLX inference failed: ${error}`)
  }
}

describe('Inference Benchmarks', () => {
  const isLinux = process.platform === 'linux'
  const isMacOS = process.platform === 'darwin'
  
  // llama.cpp benchmarks (cross-platform)
  if (process.env.BENCHMARK_LLAMA_CPP === 'true') {
    describe('llama.cpp', () => {
      const modelPath = process.env.LLAMA_MODEL_PATH || './models/llama-2-7b-chat.gguf'
      
      bench('single inference', async () => {
        await runLlamaCpp(SAMPLE_PROMPTS[0], modelPath)
      }, { timeout: 60000 })
      
      BATCH_SIZES.forEach(size => {
        bench(`batch inference (${size} prompts)`, async () => {
          const promises = SAMPLE_PROMPTS.slice(0, size).map(prompt => 
            runLlamaCpp(prompt, modelPath)
          )
          await Promise.all(promises)
        }, { timeout: 120000 })
      })
      
      bench('tokens per second', async () => {
        const longPrompt = 'Write a detailed explanation about ' + SAMPLE_PROMPTS.join(' and ')
        const result = await runLlamaCpp(longPrompt, modelPath)
        const tokens = result.text.split(' ').length
        const tps = (tokens / result.time) * 1000
        console.log(`Tokens per second: ${tps.toFixed(2)}`)
      }, { timeout: 60000 })
    })
  }
  
  // Candle benchmarks (with Metal support on macOS)
  if (process.env.BENCHMARK_CANDLE === 'true') {
    describe('Candle', () => {
      const modelPath = process.env.CANDLE_MODEL_PATH || './models/phi-2'
      
      bench('single inference', async () => {
        await runCandle(SAMPLE_PROMPTS[0], modelPath)
      }, { timeout: 60000 })
      
      if (isMacOS) {
        bench('Metal-accelerated inference', async () => {
          process.env.CANDLE_METAL = '1'
          await runCandle(SAMPLE_PROMPTS[0], modelPath)
          delete process.env.CANDLE_METAL
        }, { timeout: 60000 })
      }
    })
  }
  
  // ONNX Runtime benchmarks
  if (process.env.BENCHMARK_ONNX === 'true') {
    describe('ONNX Runtime', () => {
      bench('single inference', async () => {
        await runONNXInference(SAMPLE_PROMPTS[0])
      }, { timeout: 30000 })
      
      bench('batch inference (5 prompts)', async () => {
        const promises = SAMPLE_PROMPTS.map(prompt => runONNXInference(prompt))
        await Promise.all(promises)
      }, { timeout: 60000 })
    })
  }
  
  // MLX benchmarks (macOS with Apple Silicon only)
  if (isMacOS && process.env.BENCHMARK_MLX === 'true') {
    describe('MLX (Metal)', () => {
      bench('single inference', async () => {
        await runMLXInference(SAMPLE_PROMPTS[0])
      }, { timeout: 60000 })
      
      bench('batch inference (5 prompts)', async () => {
        const promises = SAMPLE_PROMPTS.map(prompt => runMLXInference(prompt))
        await Promise.all(promises)
      }, { timeout: 120000 })
    })
  }
  
  // WebGPU benchmarks (future)
  if (process.env.BENCHMARK_WEBGPU === 'true') {
    describe('WebGPU', () => {
      bench.skip('single inference', async () => {
        // WebGPU inference implementation would go here
        // This is a placeholder for future WebGPU support
      })
    })
  }
})

// Memory usage benchmarks
describe('Inference Memory Usage', () => {
  bench('llama.cpp memory footprint', async () => {
    if (process.env.BENCHMARK_LLAMA_CPP !== 'true') return
    
    const modelPath = process.env.LLAMA_MODEL_PATH || './models/llama-2-7b-chat.gguf'
    const memBefore = process.memoryUsage()
    
    await runLlamaCpp('Hello', modelPath)
    
    const memAfter = process.memoryUsage()
    const memUsed = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024
    console.log(`Memory used: ${memUsed.toFixed(2)} MB`)
  }, { timeout: 60000 })
})

// Latency benchmarks
describe('Inference Latency', () => {
  const latencyPrompt = 'Hello'
  
  if (process.env.BENCHMARK_LLAMA_CPP === 'true') {
    bench('llama.cpp first token latency', async () => {
      const modelPath = process.env.LLAMA_MODEL_PATH || './models/llama-2-7b-chat.gguf'
      const startTime = Date.now()
      
      const child = spawn('./llama', [
        '-m', modelPath,
        '-p', latencyPrompt,
        '-n', '1',  // just one token
        '-t', '4',
      ])
      
      await new Promise((resolve) => {
        child.stdout.once('data', () => {
          const latency = Date.now() - startTime
          console.log(`First token latency: ${latency}ms`)
          child.kill()
          resolve(null)
        })
      })
    }, { timeout: 30000 })
  }
})