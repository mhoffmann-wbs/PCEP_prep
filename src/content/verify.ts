// Checks items against real Python: what an item claims its code prints or
// raises must be what Pyodide actually does. Used by the content tests.
import type { PyodideAPI } from 'pyodide'
import { runPython } from '../python/runtime'
import { BLANK_RE, INSERT_MARKER, type Item, completeProgram } from './schema'

type Outcome = { stdout: string; error: string | null }

const execute = (py: PyodideAPI, code: string): Outcome => {
  const r = runPython(py, { code })
  return { stdout: r.stdout, error: r.error?.type ?? null }
}

const same = (a: Outcome, b: Outcome) => a.stdout === b.stdout && a.error === b.error
const show = (o: Outcome) => (o.error ? `${JSON.stringify(o.stdout)} then ${o.error}` : JSON.stringify(o.stdout))

/** What the item says its complete program does. */
const claimed = (item: Item): Outcome | null =>
  item.output !== undefined ? { stdout: item.output, error: null } : item.raises ? { stdout: '', error: item.raises } : null

/** Programs built from each wrong answer; none may behave like the key. */
function wrongPrograms(item: Item): [label: string, code: string][] {
  if (item.kind === 'insert') {
    const line = item.code.split('\n').find((l) => l.includes(INSERT_MARKER))!
    const indent = line.slice(0, line.indexOf(INSERT_MARKER))
    return item.options
      .filter((o) => !o.correct)
      .map((o) => [`option "${o.text}"`, item.code.replace(INSERT_MARKER, o.text.split('\n').join(`\n${indent}`))])
  }
  if (item.kind === 'gap') {
    const fill = (n: number, value: string) =>
      item.code.replace(BLANK_RE, (_, k: string) => {
        if (Number(k) === n) return value
        const b = item.blanks.find((x) => x.n === Number(k))!
        return b.kind === 'text' ? b.accept[0]! : b.answer
      })
    return item.blanks.flatMap((b) =>
      b.kind === 'choice' ? b.choices.filter((c) => c !== b.answer).map((c): [string, string] => [`blank ${b.n} = "${c}"`, fill(b.n, c)]) : [],
    )
  }
  return []
}

/**
 * Problems with one item, checked in two Pyodide instances that use different
 * hash seeds (so output that depends on set or hash order is caught).
 */
export function verifyItem(item: Item, pys: [PyodideAPI, PyodideAPI]): string[] {
  const program = completeProgram(item)
  const claim = claimed(item)
  if (program === null || claim === null) return []
  const problems: string[] = []
  const [a, b] = pys.map((py) => execute(py, program)) as [Outcome, Outcome]

  if (claim.error) {
    if (a.error !== claim.error) problems.push(`raises ${a.error ?? 'nothing'}, item says ${claim.error}`)
  } else if (!same(a, claim)) problems.push(`prints ${show(a)}, item says ${show(claim)}`)
  if (!same(a, b)) problems.push(`output is not deterministic: ${show(a)} vs ${show(b)}`)

  for (const [label, code] of wrongPrograms(item)) {
    if (same(execute(pys[0], code), a)) problems.push(`wrong answer ${label} behaves exactly like the key`)
  }
  if (item.kind === 'order' && item.mode === 'code') {
    for (const order of item.altOrders ?? []) {
      const alt = execute(pys[0], order.map((i) => item.lines[i]).join('\n'))
      if (!same(alt, a)) problems.push(`alternative order ${order} prints ${show(alt)}, not ${show(a)}`)
    }
  }
  return problems.map((p) => `${item.id}: ${p}`)
}
