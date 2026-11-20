import { describe, expect, it } from 'vitest'
import type { Trace, TraceStep } from '../python/runtime'
import { changedVars, describeStep, outputUpTo, previousLine, varKey } from './trace'

const v = (name: string, value: string, ref: number | null = null) => ({ name, value, type: 'int', ref })
const step = (event: TraceStep['event'], line: number | null, vars: ReturnType<typeof v>[], out = '', detail: string | null = null): TraceStep => ({
  event,
  line,
  frames: [{ name: 'Global', vars }],
  out,
  detail,
})

const trace: Trace = {
  truncated: false,
  steps: [
    step('line', 1, []),
    step('line', 2, [v('a', '[1]', 1)]),
    step('line', 3, [v('a', '[1, 2]', 1), v('b', '[1, 2]', 1)], 'hi\n'),
    step('end', null, [v('a', '[1, 2]', 1), v('b', '[1, 2]', 1)], 'bye\n'),
  ],
}

describe('trace helpers', () => {
  it('describes each kind of step', () => {
    expect(describeStep(step('line', 4, []))).toBe('Line 4 runs next.')
    expect(describeStep({ ...step('return', 2, [], '', '8'), frames: [{ name: 'Global', vars: [] }, { name: 'double', vars: [] }] })).toBe(
      '`double()` returns `8`.',
    )
    expect(describeStep(step('exception', 3, [], '', 'KeyError: 1'))).toBe('Line 3 raised `KeyError: 1`.')
    expect(describeStep(step('end', null, []))).toBe('The program finished.')
    expect(describeStep(step('error', 2, [], '', 'NameError: x'))).toBe('The program stopped with `NameError: x`.')
  })

  it('marks new and changed variables, not unchanged ones', () => {
    expect(changedVars(trace, 0).size).toBe(0)
    expect([...changedVars(trace, 1)]).toEqual([varKey(0, 'Global', 'a')])
    expect([...changedVars(trace, 2)].sort()).toEqual([varKey(0, 'Global', 'a'), varKey(0, 'Global', 'b')])
    expect(changedVars(trace, 3).size).toBe(0)
  })

  it('joins the output printed up to a step', () => {
    expect(outputUpTo(trace, 1)).toBe('')
    expect(outputUpTo(trace, 3)).toBe('hi\nbye\n')
  })

  it('finds the line that just ran', () => {
    expect(previousLine(trace, 0)).toBeNull()
    expect(previousLine(trace, 2)).toBe(2)
    expect(previousLine(trace, 3)).toBe(3)
  })
})
