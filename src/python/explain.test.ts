// The error messages come from real Python (Pyodide), never from memory.
import type { PyodideAPI } from 'pyodide'
import { beforeAll, describe, expect, it } from 'vitest'
import { OBJECTIVE_BY_ID } from '../content/blueprint'
import { PYODIDE_LOAD_MS, getPyodide } from '../test/pyodide'
import { TIMEOUT_TYPE, explainError } from './explain'
import { runPython } from './runtime'

let py: PyodideAPI
beforeAll(async () => {
  py = await getPyodide()
}, PYODIDE_LOAD_MS)

const CASES: [key: string, code: string][] = [
  ['missing-colon', 'if True\n    pass'],
  ['unclosed-bracket', 'print("hi"'],
  ['unterminated-string', 'print("hi)'],
  ['assign-vs-compare', 'x = 1\nif x = 1:\n    pass'],
  ['cannot-assign', '5 = x'],
  ['invalid-syntax', 'class = 3'],
  ['expected-indent', 'if True:\nprint(1)'],
  ['unexpected-indent', 'x = 1\n    y = 2'],
  ['unindent-mismatch', 'if True:\n        x = 1\n    y = 2'],
  ['concat-str', 'print("Age: " + 30)'],
  ['unsupported-operand', 'print("3" - 1)'],
  ['missing-argument', 'def f(a, b):\n    pass\nf(1)'],
  ['too-many-arguments', 'def f(a):\n    pass\nf(1, 2)'],
  ['not-callable', 'total = 5\ntotal()'],
  ['item-assignment', 's = "cat"\ns[0] = "b"'],
  ['none-subscript', 'nums = [3, 1].sort()\nprint(nums[0])'],
  ['not-supported-between', 'print(3 < "4")'],
  ['invalid-literal', 'int("ten")'],
  ['float-conversion', 'float("3,5")'],
  ['unpack', 'a, b = 1, 2, 3'],
  ['not-in-list', '[1, 2].index(5)'],
  ['name-not-defined', 'print(scroe)'],
  ['unbound-local', 'n = 1\ndef f():\n    n += 1\nf()'],
  ['index-out-of-range', 'print([1, 2][2])'],
  ['key-missing', 'print({"a": 1}["b"])'],
  ['zero-division', 'print(1 // 0)'],
  ['none-attribute', 'x = None\nx.append(1)'],
  ['no-attribute', '[].push(1)'],
  ['file-not-found', 'open("missing.txt")'],
  ['eof', 'input()'],
  ['recursion', 'def f():\n    return f()\nf()'],
]

describe('explainError', () => {
  it.each(CASES)('explains %s', (key, code) => {
    const { error } = runPython(py, { code })
    expect(error).not.toBeNull()
    const explanation = explainError(error!)
    expect(explanation.key).toBe(key)
    expect(OBJECTIVE_BY_ID.has(explanation.lessonId)).toBe(true)
  })

  it('explains a timeout and falls back for unknown errors', () => {
    expect(explainError({ type: TIMEOUT_TYPE, message: '', line: null, traceback: '' }).key).toBe('timeout')
    const r = runPython(py, { code: 'raise OverflowError("big")' })
    expect(explainError(r.error!)).toMatchObject({ key: 'generic', title: 'OverflowError', lessonId: '4.2.1' })
  })
})
