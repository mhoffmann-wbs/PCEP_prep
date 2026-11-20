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

export interface RunResult {
  stdout: string
  stderr: string
  error: PyError | null
  /** Files in the working directory after the run (null for binary files). */
  files: Record<string, string | null>
  /** Results of the request's checks; empty when there are none or the program raised. */
  checks: CheckResult[]
}

export interface RunHooks {
  onStdout?: (text: string) => void
  onStderr?: (text: string) => void
}

type Harness = { reset: (files: string) => void; run: (src: string, checks: string) => string; files: () => string }

const harnesses = new WeakMap<PyodideAPI, Harness>()

function harnessFor(py: PyodideAPI): Harness {
  let h = harnesses.get(py)
  if (!h) {
    const ns = py.globals.get('dict')()
    py.runPython(harness, { globals: ns })
    h = { reset: ns.get('pcep_reset'), run: ns.get('pcep_run'), files: ns.get('pcep_files') }
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
  py.setStdin({ stdin: () => lines.shift() })
  h.reset(JSON.stringify(req.files ?? {}))
  const { error, checks } = JSON.parse(h.run(req.code, JSON.stringify(req.checks ?? []))) as Pick<RunResult, 'error' | 'checks'>
  return { stdout: out.text(), stderr: err.text(), error, files: JSON.parse(h.files()), checks }
}
