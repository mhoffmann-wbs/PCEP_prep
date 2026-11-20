import { describe, expect, it } from 'vitest'
import { ALL_KINDS, GAP, INSERT, MULTI, ORDER, SINGLE } from '../test/fixtures'
import { completeProgram, itemSchema } from './schema'

const errors = (item: unknown) => {
  const r = itemSchema.safeParse(item)
  return r.success ? [] : r.error.issues.map((i) => i.message)
}

describe('item schema', () => {
  it.each(ALL_KINDS.map((i) => [i.kind, i] as const))('accepts a valid %s item', (_, item) => {
    expect(errors(item)).toEqual([])
  })

  it('rejects an unknown kind', () => {
    expect(errors({ ...SINGLE, kind: 'essay' })).not.toEqual([])
  })

  it('checks ids and sub-points against the objective', () => {
    expect(errors({ ...SINGLE, id: '2.2.4-01' })).toContain('id must start with objectiveId')
    expect(errors({ ...SINGLE, subpoints: ['2.2.4.1'] })).toContain('sub-point 2.2.4.1 is not under 2.2.3')
    expect(errors({ ...SINGLE, id: '2.2.3-1' })).not.toEqual([])
  })

  it('single: needs exactly one correct option and a matching output key', () => {
    const two = { ...SINGLE, options: SINGLE.options.map((o) => ({ ...o, correct: true })) }
    expect(errors(two)).toContain('single needs exactly 1 correct option')
    expect(errors({ ...SINGLE, output: '1 3 5 7' })).toContain('correct option must equal output')
    expect(errors({ ...SINGLE, output: undefined })).toContain('outputKey needs output')
    expect(errors({ ...SINGLE, output: undefined, outputKey: false })).toContain(
      'stem asks for the output: set output or raises so it is checked in Pyodide',
    )
    expect(errors({ ...SINGLE, raises: 'TypeError' })).toContain('use either output or raises, not both')
  })

  it('multi: correct count must match select and the stem', () => {
    expect(errors({ ...MULTI, select: 3 })).toEqual(
      expect.arrayContaining(['multi has 2 correct options, select is 3', 'stem must say "(Select THREE)"']),
    )
    expect(errors({ ...MULTI, stem: 'Which are valid identifiers?' })).toContain('stem must say "(Select TWO)"')
  })

  it('gap: blanks in code must match declared blanks', () => {
    expect(errors({ ...GAP, code: 'x = __BLANK2__' })).toContain('blanks in code (2) do not match blanks (1)')
    expect(errors({ ...GAP, code: '__BLANK1__ = __BLANK1__' })).toContain('each blank may appear only once in code')
    const bad = { ...GAP, blanks: [{ ...GAP.blanks[0]!, answer: 'pairs' }] }
    expect(errors(bad)).toContain('answer must be one of choices')
  })

  it('order: alternative orders must be other permutations', () => {
    expect(errors({ ...ORDER, altOrders: [[0, 1, 2]] })).toContain('altOrders entry must be a permutation of line indexes')
    expect(errors({ ...ORDER, altOrders: [[0, 1, 2, 3]] })).toContain('altOrders must not repeat the main order')
  })

  it('insert: needs one marker and a target output', () => {
    expect(errors({ ...INSERT, code: 'print(1)' })).toContain('code must contain "# >>> INSERT <<<" exactly once')
    expect(errors({ ...INSERT, output: undefined })).toContain('insert needs the target output')
  })
})

describe('completeProgram', () => {
  it('fills gaps, inserts at the marker indent and joins ordered lines', () => {
    expect(completeProgram(GAP)).toContain('ages.items():')
    expect(completeProgram(INSERT)).toBe('def area(w, h):\n    return w * h\n\nprint(area(3, 4))')
    expect(completeProgram(ORDER)).toBe('price = 4\nqty = 3\ntotal = price * qty\nprint(total)')
    expect(completeProgram(MULTI)).toBeNull()
  })
})
