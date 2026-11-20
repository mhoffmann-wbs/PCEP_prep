// Grades an exercise attempt by running it. The runner is passed in, so the
// page uses the worker and the content tests use Pyodide in Node directly.
import type { Exercise } from '../content/schema'
import type { PyError, RunRequest, RunResult } from '../python/runtime'

export type Run = (req: RunRequest) => Promise<RunResult> | RunResult

export interface CheckRow {
  /** What was tried: the call, or the input typed. */
  label: string
  passed: boolean
  /** Why it failed, one line each (empty when it passed). */
  details: string[]
}

export interface CheckReport {
  passed: boolean
  rows: CheckRow[]
  /** The program itself raised (for `function` exercises the checks then can't run). */
  error: PyError | null
}

/** Output compared line by line, ignoring trailing spaces and blank lines at the end (as the harness does). */
export const sameOutput = (a: string, b: string) => {
  const lines = (s: string) => s.replace(/\r\n/g, '\n').trimEnd().split('\n').map((l) => l.trimEnd()).join('\n')
  return lines(a) === lines(b)
}

const quote = (text: string) => (text.trimEnd() === '' ? '(nothing)' : text.trimEnd())

export async function checkExercise(ex: Exercise, code: string, run: Run): Promise<CheckReport> {
  if (ex.kind === 'function') {
    const result = await run({ code, files: ex.files, checks: ex.checks })
    if (result.error) return { passed: false, rows: [], error: result.error }
    const rows = result.checks.map((r, i): CheckRow => {
      const check = ex.checks[i]!
      const details: string[] = []
      if (!r.passed) {
        if (check.raises) details.push(r.error ? `raised ${r.error}, expected ${check.raises}` : `expected ${check.raises}, but nothing was raised`)
        else if (r.error) details.push(`raised ${r.error}`)
        else {
          if (r.want !== null && r.want !== r.got) details.push(`returned ${r.got}, expected ${r.want}`)
          else if (r.want !== null) details.push(`returned ${r.got}, but of the wrong type`)
          if (check.prints !== undefined && !sameOutput(r.printed, check.prints))
            details.push(`printed:\n${quote(r.printed)}\nexpected:\n${quote(check.prints)}`)
        }
      }
      return { label: r.call, passed: r.passed, details }
    })
    return { passed: rows.every((r) => r.passed), rows, error: null }
  }

  const rows: CheckRow[] = []
  let firstError: PyError | null = null
  for (const c of ex.cases) {
    const result = await run({ code, stdin: c.stdin, files: ex.files })
    const details: string[] = []
    if (result.error) {
      firstError ??= result.error
      details.push(`raised ${result.error.type}: ${result.error.message}`)
    }
    if (!sameOutput(result.stdout, c.stdout)) details.push(`printed:\n${quote(result.stdout)}\nexpected:\n${quote(c.stdout)}`)
    for (const [name, text] of Object.entries(c.writes ?? {})) {
      const written = result.files[name]
      if (written === undefined) details.push(`${name} was not created`)
      else if (written !== text) details.push(`${name} contains:\n${quote(written ?? '')}\nexpected:\n${quote(text)}`)
    }
    const label = c.stdin ? `Input: ${c.stdin.trimEnd().split('\n').join(' ⏎ ')}` : ex.cases.length > 1 ? `Run ${rows.length + 1}` : 'Run'
    rows.push({ label, passed: details.length === 0, details })
  }
  return { passed: rows.every((r) => r.passed), rows, error: firstError }
}
