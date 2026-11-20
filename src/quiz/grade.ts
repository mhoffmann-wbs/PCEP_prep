// Learner responses and all-or-nothing grading for every item kind.
import type { Item } from '../content/schema'

export type Response =
  | { kind: 'single' | 'insert'; choice: number | null }
  | { kind: 'multi'; choices: number[] }
  | { kind: 'gap'; values: Record<number, string> }
  /** Indexes into item.lines, in the order the learner arranged them. */
  | { kind: 'order'; order: number[] }

export function emptyResponse(item: Item, shuffledOrder?: number[]): Response {
  switch (item.kind) {
    case 'single':
    case 'insert':
      return { kind: item.kind, choice: null }
    case 'multi':
      return { kind: 'multi', choices: [] }
    case 'gap':
      return { kind: 'gap', values: {} }
    case 'order':
      return { kind: 'order', order: shuffledOrder ?? item.lines.map((_, i) => i) }
  }
}

/** Collapse whitespace and drop it around punctuation: "[ : ]" equals "[:]". */
export const normaliseAnswer = (s: string) =>
  s
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\s*([^\w\s])\s*/g, '$1')

/** Whether the learner has given an answer that can be checked. */
export function isAnswered(item: Item, r: Response): boolean {
  switch (r.kind) {
    case 'single':
    case 'insert':
      return r.choice !== null
    case 'multi':
      return item.kind === 'multi' && r.choices.length === item.select
    case 'gap':
      return item.kind === 'gap' && item.blanks.every((b) => (r.values[b.n] ?? '').trim() !== '')
    case 'order':
      return true
  }
}

export function blankCorrect(item: Extract<Item, { kind: 'gap' }>, n: number, value: string | undefined): boolean {
  const blank = item.blanks.find((b) => b.n === n)
  if (!blank || value === undefined) return false
  return blank.kind === 'choice' ? value === blank.answer : blank.accept.some((a) => normaliseAnswer(a) === normaliseAnswer(value))
}

export function grade(item: Item, r: Response): boolean {
  if (item.kind !== r.kind) return false
  switch (r.kind) {
    case 'single':
    case 'insert':
      return item.kind !== 'multi' && 'options' in item && r.choice !== null && !!item.options[r.choice]?.correct
    case 'multi': {
      if (item.kind !== 'multi') return false
      const key = item.options.flatMap((o, i) => (o.correct ? [i] : []))
      return r.choices.length === key.length && key.every((i) => r.choices.includes(i))
    }
    case 'gap':
      return item.kind === 'gap' && item.blanks.every((b) => blankCorrect(item, b.n, r.values[b.n]))
    case 'order': {
      if (item.kind !== 'order') return false
      const got = r.order.join(',')
      const main = item.lines.map((_, i) => i).join(',')
      return got === main || (item.altOrders ?? []).some((o) => o.join(',') === got)
    }
  }
}
