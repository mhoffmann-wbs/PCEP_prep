// Checks one documented snippet (from a lesson or a guide) against real Python:
// what the text claims it prints or raises must be what Pyodide does, in two
// instances with different hash seeds.
import type { PyodideAPI } from 'pyodide'
import { runPython } from '../python/runtime'
import type { Snippet } from './snippets'

const lastLine = (s: string) => s.trimEnd().split('\n').at(-1) ?? ''

/** Problems with one snippet: its claim must match real Python, in both hash seeds. */
export function checkSnippet(s: Snippet, pys: [PyodideAPI, PyodideAPI]): string[] {
  const [a, b] = pys.map((py) => runPython(py, { code: s.code, stdin: s.stdin }))
  const where = `snippet at line ${s.line}`
  const problems: string[] = []
  const errorLine = a!.error ? lastLine(a!.error.traceback) : null
  if (a!.stdout !== b!.stdout || errorLine !== (b!.error ? lastLine(b!.error.traceback) : null))
    problems.push(`${where}: output is not deterministic`)
  if (s.error !== undefined) {
    if (errorLine !== s.error.trim()) problems.push(`${where}: raises ${JSON.stringify(errorLine)}, the text says ${JSON.stringify(s.error.trim())}`)
  } else {
    if (errorLine) problems.push(`${where}: unexpected error ${JSON.stringify(errorLine)}`)
    if (s.output !== undefined && a!.stdout.replace(/\n$/, '') !== s.output)
      problems.push(`${where}: prints ${JSON.stringify(a!.stdout)}, the text says ${JSON.stringify(s.output)}`)
  }
  return problems
}
