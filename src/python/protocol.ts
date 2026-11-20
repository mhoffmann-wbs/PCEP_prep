// Messages between the main thread (client.ts) and the Pyodide worker (worker.ts).
import type { RunRequest, RunResult } from './runtime'

export type ToWorker =
  | { type: 'run'; id: number; req: RunRequest }
  /** Shared memory for interactive input(), sent once when the page can share memory. */
  | { type: 'init'; inputBuffer: SharedArrayBuffer }

export type FromWorker =
  | { type: 'ready' }
  | { type: 'failed'; message: string }
  | { type: 'start'; id: number }
  | { type: 'stdout' | 'stderr'; id: number; text: string }
  /** The program waits in input() for the learner's line (see inputChannel.ts). */
  | { type: 'input'; id: number }
  | { type: 'done'; id: number; result: RunResult }
