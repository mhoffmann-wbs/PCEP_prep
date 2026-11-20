import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PythonRunner, type RunnerStatus, type WorkerLike } from './client'
import type { FromWorker, ToWorker } from './protocol'

// A fake worker: echoes the code as stdout, or hangs when the code is "hang".
class FakeWorker implements WorkerLike {
  static created: FakeWorker[] = []
  onmessage: ((e: MessageEvent<FromWorker>) => void) | null = null
  terminated = false
  constructor() {
    FakeWorker.created.push(this)
    queueMicrotask(() => this.emit({ type: 'ready' }))
  }
  emit(data: FromWorker) {
    if (!this.terminated) this.onmessage?.({ data } as MessageEvent<FromWorker>)
  }
  postMessage({ id, req }: ToWorker) {
    this.emit({ type: 'start', id })
    if (req.code === 'hang') {
      this.emit({ type: 'stdout', id, text: 'partial\n' })
      return
    }
    this.emit({ type: 'stdout', id, text: req.code })
    this.emit({ type: 'done', id, result: { stdout: req.code, stderr: '', error: null, files: {} } })
  }
  terminate() {
    this.terminated = true
  }
}

beforeEach(() => {
  FakeWorker.created = []
  vi.useFakeTimers()
})
afterEach(() => vi.useRealTimers())

const runner = () => new PythonRunner(() => new FakeWorker(), 5000)

describe('PythonRunner', () => {
  it('creates the worker lazily and reuses it', async () => {
    const r = runner()
    expect(FakeWorker.created).toHaveLength(0)
    expect((await r.run({ code: 'a' })).stdout).toBe('a')
    expect((await r.run({ code: 'b' })).stdout).toBe('b')
    expect(FakeWorker.created).toHaveLength(1)
  })

  it('streams output and reports status changes', async () => {
    const r = runner()
    const statuses: RunnerStatus[] = []
    r.subscribe((s) => statuses.push(s))
    const chunks: string[] = []
    await r.run({ code: 'hello' }, { onStdout: (t) => chunks.push(t) })
    expect(chunks).toEqual(['hello'])
    expect(statuses).toEqual(['loading', 'ready', 'running', 'ready'])
  })

  it('stops a run that exceeds the time limit and starts a fresh worker next time', async () => {
    const r = runner()
    const pending = r.run({ code: 'hang' })
    await vi.advanceTimersByTimeAsync(5000)
    const outcome = await pending
    expect(outcome).toMatchObject({ timedOut: true, stdout: 'partial\n', error: { type: 'Timeout' } })
    expect(FakeWorker.created[0]!.terminated).toBe(true)
    expect(r.status).toBe('idle')
    expect((await r.run({ code: 'ok' })).stdout).toBe('ok')
    expect(FakeWorker.created).toHaveLength(2)
  })

  it('runs queued requests one at a time, in order', async () => {
    const r = runner()
    const results = await Promise.all([r.run({ code: '1' }), r.run({ code: '2' }), r.run({ code: '3' })])
    expect(results.map((x) => x.stdout)).toEqual(['1', '2', '3'])
  })
})
