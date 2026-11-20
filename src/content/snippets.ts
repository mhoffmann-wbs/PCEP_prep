// Finds the code snippets in a lesson's MDX source and what each one claims to
// print. A ```python block may be followed (with only blank lines between) by an
// ```input block (lines for input()) and then an ```output or ```error block.
// The content tests run every snippet in Pyodide and compare.

export interface Snippet {
  /** 1-based line of the ```python fence, for error messages. */
  line: number
  code: string
  stdin?: string
  /** Exact stdout the snippet prints (trailing newline optional). */
  output?: string
  /** Last traceback line, e.g. "ZeroDivisionError: division by zero". */
  error?: string
}

interface Fence {
  lang: string
  text: string
  start: number
  end: number
}

export function fences(source: string): Fence[] {
  const lines = source.split('\n')
  const out: Fence[] = []
  for (let i = 0; i < lines.length; i++) {
    const open = lines[i]!.match(/^```(\w*)\s*$/)
    if (!open) continue
    const close = lines.findIndex((l, j) => j > i && /^```\s*$/.test(l))
    if (close < 0) break
    out.push({ lang: open[1]!, text: lines.slice(i + 1, close).join('\n'), start: i, end: close })
    i = close
  }
  return out
}

export function extractSnippets(source: string): Snippet[] {
  const lines = source.split('\n')
  const all = fences(source)
  const adjacent = (a: Fence, b: Fence | undefined) => !!b && lines.slice(a.end + 1, b.start).every((l) => l.trim() === '')
  const snippets: Snippet[] = []
  for (let i = 0; i < all.length; i++) {
    const f = all[i]!
    if (f.lang !== 'python') continue
    const snippet: Snippet = { line: f.start + 1, code: f.text }
    let prev = f
    let next = all[i + 1]
    if (next?.lang === 'input' && adjacent(prev, next)) {
      snippet.stdin = next.text
      prev = next
      next = all[i + 2]
    }
    if ((next?.lang === 'output' || next?.lang === 'error') && adjacent(prev, next)) snippet[next.lang] = next.text
    snippets.push(snippet)
  }
  return snippets
}
