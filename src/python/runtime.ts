// Runs learner code in a Pyodide instance. No browser dependencies: the Web
// Worker and the Vitest content tests (Pyodide in Node) both use this module.
import type { PyodideAPI } from 'pyodide'
import harness from './harness.py?raw'

export interface RunRequest {
  code: string
  /** Lines fed to input(), one per line; input() raises EOFError when they run out. */
  stdin?: string
  /** Files placed in the working directory before the run. */
  files?: Record<string, string>
  /** Exercise checks evaluated in the program's globals after it runs without an error. */
  checks?: FunctionCheck[]
  /** input() doesn't print its prompt (exercise checks compare output exactly). */
  quietInput?: boolean
  /** Record a step before every line for the step-through visualizer (checks are ignored). */
  trace?: boolean
  /** When the stdin lines run out, input() asks the learner (if the page can share memory with the worker). */
  interactive?: boolean
}

/**
 * One check of a `function` exercise: `call` is a Python expression evaluated in
 * the learner's globals. It passes when the value equals `expect` (same type
 * too), what it printed matches `prints`, and/or it raised `raises`.
 */
export interface FunctionCheck {
  call: string
  expect?: string
  prints?: string
  raises?: string
}

export interface CheckResult {
  call: string
  passed: boolean
  /** repr() of the value returned (null if it raised). */
  got: string | null
  /** repr() of the expected value, when the check has `expect`. */
  want: string | null
  printed: string
  /** "TypeError: ..." if the call raised. */
  error: string | null
}

export interface PyError {
  /** Exception class name, e.g. "NameError". */
  type: string
  message: string
  /** Line in the learner's code, when known. */
  line: number | null
  /** Traceback trimmed to the learner's own lines. */
  traceback: string
}

/** A value as the visualizer shows it. */
export interface TraceValue {
  /** repr(), shortened; "function f" or "module math" for those. */
  value: string
  type: string
  /** For lists, dicts and sets: a number per object, so equal numbers mean one shared object. */
  ref: number | null
}

export interface TraceFrame {
  /** "Global", or the function's name. */
  name: string
  vars: (TraceValue & { name: string })[]
}

export interface TraceStep {
  /**
   * line: the line is about to run; return: a function returns `detail`;
   * exception: `detail` was raised on the line; end / error: the program finished or stopped.
   */
  event: 'line' | 'return' | 'exception' | 'end' | 'error'
  line: number | null
  /** Outermost first: Global, then each active function call. */
  frames: TraceFrame[]
  /** Text printed since the previous step. */
  out: string
  detail: string | null
}

export interface Trace {
  steps: TraceStep[]
  /** The program reached the step limit and was stopped. */
  truncated: boolean
}

export interface RunResult {
  stdout: string
  stderr: string
  error: PyError | null
  /** Files in the working directory after the run (null for binary files). */
  files: Record<string, string | null>
  /** Results of the request's checks; empty when there are none or the program raised. */
  checks: CheckResult[]
  /** The recorded steps, for a run with `trace`. */
  trace: Trace | null
}

export interface RunHooks {
  onStdout?: (text: string) => void
  onStderr?: (text: string) => void
  /** Called (and may block) when input() has no stdin lines left: a line, or null to end the input. */
  onInput?: () => string | null
}

type Harness = {
  reset: (files: string) => void
  run: (src: string, checks: string, quietInput: boolean) => string
  trace: (src: string) => string
  files: () => string
}

const harnesses = new WeakMap<PyodideAPI, Harness>()

function harnessFor(py: PyodideAPI): Harness {
  let h = harnesses.get(py)
  if (!h) {
    const ns = py.globals.get('dict')()
    py.runPython(harness, { globals: ns })
    h = { reset: ns.get('pcep_reset'), run: ns.get('pcep_run'), trace: ns.get('pcep_trace'), files: ns.get('pcep_files') }
    harnesses.set(py, h)
  }
  return h
}

const capture = (onText?: (text: string) => void) => {
  const decoder = new TextDecoder()
  const chunks: string[] = []
  return {
    write: (buffer: Uint8Array) => {
      const text = decoder.decode(buffer, { stream: true })
      chunks.push(text)
      onText?.(text)
      return buffer.length
    },
    text: () => chunks.join(''),
  }
}

/** Runs one program with fresh globals, stdin and working directory. */
export function runPython(py: PyodideAPI, req: RunRequest, hooks: RunHooks = {}): RunResult {
  const h = harnessFor(py)
  const out = capture(hooks.onStdout)
  const err = capture(hooks.onStderr)
  const lines = req.stdin ? req.stdin.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n') : []
  py.setStdout({ write: out.write })
  py.setStderr({ write: err.write })
  py.setStdin({ stdin: () => (lines.length ? lines.shift() : (hooks.onInput?.() ?? undefined)) })
  h.reset(JSON.stringify(req.files ?? {}))
  const files = () => JSON.parse(h.files()) as RunResult['files']
  if (req.trace) {
    const { error, steps, truncated } = JSON.parse(h.trace(req.code)) as Trace & Pick<RunResult, 'error'>
    return { stdout: out.text(), stderr: err.text(), error, files: files(), checks: [], trace: { steps, truncated } }
  }
  const { error, checks } = JSON.parse(h.run(req.code, JSON.stringify(req.checks ?? []), req.quietInput ?? false)) as Pick<RunResult, 'error' | 'checks'>
  return { stdout: out.text(), stderr: err.text(), error, files: files(), checks, trace: null }
}
