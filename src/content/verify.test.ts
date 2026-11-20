// The build-time output check: every item's claimed output or exception is
// compared with what its code really does in Pyodide.
import type { PyodideAPI } from 'pyodide'
import { beforeAll, describe, expect, it } from 'vitest'
import { ALL_KINDS, GAP, INSERT, ORDER, SINGLE } from '../test/fixtures'
import { PYODIDE_LOAD_MS, getPyodidePair } from '../test/pyodide'
import { ITEMS } from './bank'
import { verifyItem } from './verify'

let pys: [PyodideAPI, PyodideAPI]
beforeAll(async () => {
  pys = await getPyodidePair()
}, PYODIDE_LOAD_MS)

describe('verifyItem', () => {
  it.each(ALL_KINDS.map((i) => [i.kind, i] as const))('passes the %s fixture', (_, item) => {
    expect(verifyItem(item, pys)).toEqual([])
  })

  it('catches a wrong output and a wrong exception', () => {
    expect(verifyItem({ ...SINGLE, output: '1 3 5 7 ', outputKey: false }, pys)).toEqual([
      '2.2.3-01: prints "1 3 5 ", item says "1 3 5 7 "',
    ])
    expect(verifyItem({ ...SINGLE, output: undefined, outputKey: false, raises: 'TypeError' }, pys)).toEqual([
      '2.2.3-01: raises nothing, item says TypeError',
    ])
  })

  it('catches output that depends on set order', () => {
    const code = 'for fruit in {"pear", "fig", "kiwi", "plum", "lime", "date"}:\n    print(fruit)'
    expect(verifyItem({ ...SINGLE, code, output: 'x', outputKey: false }, pys).join()).toContain('not deterministic')
  })

  it('catches distractors that work as well as the key', () => {
    const insert = { ...INSERT, options: INSERT.options.map((o, i) => (i === 3 ? { ...o, text: 'return h * w' } : o)) }
    expect(verifyItem(insert, pys)).toEqual(['4.1.2-01: wrong answer option "return h * w" behaves exactly like the key'])
    const gap = {
      ...GAP,
      code: 'ages = {"Rex": 3, "Tom": 5}\nfor name in ages.__BLANK1__():\n    print(name)',
      output: 'Rex\nTom\n',
      blanks: [{ ...GAP.blanks[0]!, choices: ['keys', 'values', 'copy'], answer: 'keys' }],
    }
    expect(verifyItem(gap, pys)).toEqual(['3.4.1-01: wrong answer blank 1 = "copy" behaves exactly like the key'])
  })

  it('checks that alternative orders print the same', () => {
    const order = { ...ORDER, altOrders: [[0, 1, 3, 2]] }
    expect(verifyItem(order, pys).join()).toContain('alternative order 0,1,3,2 prints')
  })
})

describe.skipIf(ITEMS.length === 0)('question bank output', () => {
  it.each(ITEMS.map((i) => [i.id, i] as const))('%s does what it claims', (_, item) => {
    expect(verifyItem(item, pys)).toEqual([])
  })
})
