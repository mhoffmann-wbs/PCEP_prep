// Main-thread side of the Python runner. The worker (and with it Pyodide) is
// created on the first run, so none of it is in the initial bundle. Runs are
// queued one at a time; a run that exceeds the time limit terminates the
// worker, and the next run starts a fresh one.
import { TIMEOUT_TYPE } from './explain'
import type { FromWorker, ToWorker } from './protocol'
import type { RunHooks, RunRequest, RunResult } from './runtime'

export type RunnerStatus = 'idle' | 'loading' | 'ready' | 'running'

export interface RunOutcome extends RunResult {
  timedOut: boolean
}

/** The parts of Worker the client uses, so tests can pass a fake. */
export interface WorkerLike {
  postMessage(msg: ToWorker): void
  terminate(): void
  onmessage: ((e: MessageEvent<FromWorker>) => void) | null
}

export const DEFAULT_TIMEOUT_MS = 5000

const createWorker = (): WorkerLike => new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })

export class PythonRunner {
  status: RunnerStatus = 'idle'
  private worker: WorkerLike | null = null
  private ready: Promise<void> | null = null
  private handlers = new Map<number, (msg: FromWorker) => void>()
  private nextId = 1
  private queue: Promise<unknown> = Promise.resolve()
  private listeners = new Set<(status: RunnerStatus) => void>()

  constructor(
    private readonly create: () => WorkerLike = createWorker,
    readonly timeoutMs = DEFAULT_TIMEOUT_MS,
  ) {}

  subscribe(listener: (status: RunnerStatus) => void) {
    this.listeners.add(listener)
    return () => void this.listeners.delete(listener)
  }

  private setStatus(status: RunnerStatus) {
    this.status = status
    for (const l of this.listeners) l(status)
  }

  /** Starts loading Pyodide without running anything. */
  warmUp(): Promise<void> {
    if (!this.ready) {
      this.setStatus('loading')
      const worker = this.create()
      this.worker = worker
      this.ready = new Promise((resolve, reject) => {
        worker.onmessage = ({ data }) => {
          if (data.type === 'ready') {
            this.setStatus('ready')
            resolve()
          } else if (data.type === 'failed') {
            this.reset()
            reject(new Error(`Python failed to load: ${data.message}`))
          } else this.handlers.get(data.id)?.(data)
        }
      })
    }
    return this.ready
  }

  private reset() {
    this.worker?.terminate()
    this.worker = null
    this.ready = null
    this.handlers.clear()
    this.setStatus('idle')
  }

  run(req: RunRequest, hooks: RunHooks = {}): Promise<RunOutcome> {
    const next = this.queue.then(() => this.runNow(req, hooks))
    this.queue = next.catch(() => {})
    return next
  }

  private async runNow(req: RunRequest, hooks: RunHooks): Promise<RunOutcome> {
    await this.warmUp()
    const id = this.nextId++
    const stdout: string[] = []
    const stderr: string[] = []
    this.setStatus('running')
    return new Promise((resolve) => {
      let timer: ReturnType<typeof setTimeout> | undefined
      const finish = (outcome: RunOutcome) => {
        clearTimeout(timer)
        this.handlers.delete(id)
        if (this.worker) this.setStatus('ready')
        resolve(outcome)
      }
      this.handlers.set(id, (msg) => {
        if (msg.type === 'start') {
          // The clock starts when the program starts, not while Pyodide loads.
          timer = setTimeout(() => {
            this.reset()
            const seconds = this.timeoutMs / 1000
            finish({
              stdout: stdout.join(''),
              stderr: stderr.join(''),
              error: { type: TIMEOUT_TYPE, message: `The program ran for more than ${seconds} seconds and was stopped.`, line: null, traceback: '' },
              files: {},
              checks: [],
              timedOut: true,
            })
          }, this.timeoutMs)
        } else if (msg.type === 'stdout') {
          stdout.push(msg.text)
          hooks.onStdout?.(msg.text)
        } else if (msg.type === 'stderr') {
          stderr.push(msg.text)
          hooks.onStderr?.(msg.text)
        } else if (msg.type === 'done') finish({ ...msg.result, timedOut: false })
      })
      this.worker!.postMessage({ type: 'run', id, req })
    })
  }
}

/** The app-wide runner. */
export const pythonRunner = new PythonRunner()
