// Messages between the main thread (client.ts) and the Pyodide worker (worker.ts).
import type { RunRequest, RunResult } from './runtime'

export type ToWorker = { type: 'run'; id: number; req: RunRequest }

export type FromWorker =
  | { type: 'ready' }
  | { type: 'failed'; message: string }
  | { type: 'start'; id: number }
  | { type: 'stdout' | 'stderr'; id: number; text: string }
  | { type: 'done'; id: number; result: RunResult }
