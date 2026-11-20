import { describe, expect, it } from 'vitest'
import { SINGLE } from '../test/fixtures'
import type { Item } from './schema'
import { duplicateStems, keyIsLongest, keyLetterBalance, letterReferences } from './quality'

type Single = Extract<Item, { kind: 'single' }>
const base = SINGLE as Single

// n single items whose key sits at `keyAt`, with distinct stems.
const pool = (n: number, keyAt: (i: number) => number, keyText = 'k'): Single[] =>
  Array.from({ length: n }, (_, i) => ({
    ...base,
    id: `2.2.3-${String(i).padStart(2, '0')}`,
    stem: `Question ${i}?`,
    options: [0, 1, 2, 3].map((j) => ({ text: j === keyAt(i) ? keyText : `opt${j}`, correct: j === keyAt(i), rationale: 'r' })),
  }))

describe('quality checks', () => {
  it('flags a key letter used in more than 40% of single items', () => {
    expect(keyLetterBalance(pool(12, () => 0))).toHaveLength(1)
    expect(keyLetterBalance(pool(12, (i) => i % 4))).toEqual([])
    expect(keyLetterBalance(pool(5, () => 0))).toEqual([]) // pool too small to judge
  })

  it('flags keys that are usually the longest option', () => {
    expect(keyIsLongest(pool(12, (i) => i % 4, 'a much longer key'))).toHaveLength(1)
    expect(keyIsLongest(pool(12, (i) => i % 4, 'k'))).toEqual([])
  })

  it('flags duplicate stem + code but allows a repeated stem with different code', () => {
    const a = { ...base, id: '2.2.3-01' }
    expect(duplicateStems([a, { ...a, id: '2.2.3-02' }])).toEqual(['2.2.3-02 duplicates the stem and code of 2.2.3-01'])
    expect(duplicateStems([a, { ...a, id: '2.2.3-02', code: 'print(1)' }])).toEqual([])
  })

  it('flags explanations that cite option letters', () => {
    for (const explanation of ['Option B is right.', 'So (C) wins.', 'The answer A is a trap.'])
      expect(letterReferences([{ ...base, explanation }])).toHaveLength(1)
    expect(letterReferences([{ ...base, explanation: 'A list is mutable, so B = A shares it.' }])).toEqual([])
  })
})
