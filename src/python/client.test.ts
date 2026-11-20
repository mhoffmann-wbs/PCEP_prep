import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PythonRunner, type RunnerStatus, type WorkerLike } from './client'
import type { FromWorker, ToWorker } from './protocol'

// A fake worker: echoes the code as stdout, hangs when the code is "hang", and
// asks for input when the code is "ask" (finish it with `answer()`).
class FakeWorker implements WorkerLike {
  static created: FakeWorker[] = []
  onmessage: ((e: MessageEvent<FromWorker>) => void) | null = null
  terminated = false
  inputBuffer: SharedArrayBuffer | null = null
  asking: number | null = null
  constructor() {
    FakeWorker.created.push(this)
    queueMicrotask(() => this.emit({ type: 'ready' }))
  }
  emit(data: FromWorker) {
    if (!this.terminated) this.onmessage?.({ data } as MessageEvent<FromWorker>)
  }
  postMessage(msg: ToWorker) {
    if (msg.type === 'init') {
      this.inputBuffer = msg.inputBuffer
      return
    }
    const { id, req } = msg
    this.emit({ type: 'start', id })
    if (req.code === 'ask') {
      this.asking = id
      this.emit({ type: 'input', id })
      return
    }
    if (req.code === 'hang') {
      this.emit({ type: 'stdout', id, text: 'partial\n' })
      return
    }
    this.emit({ type: 'stdout', id, text: req.code })
    this.emit({ type: 'done', id, result: { stdout: req.code, stderr: '', error: null, files: {}, checks: [], trace: null } })
  }
  /** Reads the page's answer from the shared buffer and finishes the run with it. */
  answer() {
    const buffer = this.inputBuffer!
    const length = new Int32Array(buffer, 0, 2)[1]!
    const out = `got ${length < 0 ? null : new TextDecoder().decode(new Uint8Array(buffer, 8, length).slice())}`
    this.emit({ type: 'done', id: this.asking!, result: { stdout: out, stderr: '', error: null, files: {}, checks: [], trace: null } })
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

  it('pauses the clock while the program waits for input, then resumes it', async () => {
    const r = new PythonRunner(() => new FakeWorker(), 5000, true)
    let asked = 0
    const pending = r.run({ code: 'ask', interactive: true }, { onInputRequest: () => asked++ })
    await vi.advanceTimersByTimeAsync(60_000)
    expect(asked).toBe(1)
    expect(r.waitingForInput).toBe(true)
    r.provideInput('Ana')
    expect(r.waitingForInput).toBe(false)
    FakeWorker.created[0]!.answer()
    expect((await pending).stdout).toBe('got Ana')
  })

  it('times out again once the input is answered, and ignores answers nobody asked for', async () => {
    const r = new PythonRunner(() => new FakeWorker(), 5000, true)
    r.provideInput('early')
    const pending = r.run({ code: 'ask', interactive: true })
    await vi.advanceTimersByTimeAsync(0)
    r.provideInput(null)
    await vi.advanceTimersByTimeAsync(5000)
    expect(await pending).toMatchObject({ timedOut: true })
  })

  it('sends no shared memory when the page is not cross-origin isolated', async () => {
    const r = runner()
    expect(r.interactive).toBe(false)
    await r.run({ code: 'a' })
    expect(FakeWorker.created[0]!.inputBuffer).toBeNull()
  })

  it('runs queued requests one at a time, in order', async () => {
    const r = runner()
    const results = await Promise.all([r.run({ code: '1' }), r.run({ code: '2' }), r.run({ code: '3' })])
    expect(results.map((x) => x.stdout)).toEqual(['1', '2', '3'])
  })
})
