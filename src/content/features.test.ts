import { describe, expect, it } from 'vitest'
import { detectFeatures } from './features'

const has = (code: string) => [...detectFeatures(code)]

describe('detectFeatures', () => {
  it.each([
    ['while (line := input()) != "":\n    pass', 'walrus'],
    ['print(f"{x}")', 'f-string'],
    ['print("{} {}".format(a, b))', 'format()'],
    ['s = set()\ns.add(1)', 'set'],
    ['def total(*nums):\n    return sum(nums)', '*args/**kwargs'],
    ['with open("a.txt") as f:\n    pass', 'files'],
    ['import math', 'csv/math/random'],
    ['print(6 & 3, 1 << 2)', 'bitwise'],
    ['for i in range(3):\n    pass\nelse:\n    print("done")', 'loop else'],
    ['print([x * 2 for x in range(3)])', 'comprehension'],
    ['print(sum(x for x in range(3)))', 'comprehension'],
    ['grid = [[0] * 3 for _ in range(2)]', 'comprehension'],
    ['def gen():\n    yield 1', 'generator'],
    ['def fact(n):\n    if n < 2:\n        return 1\n    return n * fact(n - 1)', 'recursion'],
    ['print(0x1F, bin(5))', 'numeral prefix'],
    ['print(1e3)', 'scientific notation'],
  ])('finds %s → %s', (code, feature) => {
    expect(has(code)).toContain(feature)
  })

  it('ignores features inside strings and comments, and plain code', () => {
    expect(has('print("a | b & c, 1e3, [x for x in y]")  # open(file) := ')).toEqual([])
    expect(has('if x > 2:\n    print("big")\nelse:\n    print("small")')).toEqual([])
    expect(has('for x in [1, 2]:\n    if x:\n        pass\n    else:\n        pass')).toEqual([])
    expect(has('d = {"a": 1}\nprint(d.items(), 7 // 2, 2 ** 3, a and b or c)')).toEqual([])
  })
})
