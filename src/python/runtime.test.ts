import type { PyodideAPI } from 'pyodide'
import { beforeAll, describe, expect, it } from 'vitest'
import { PYODIDE_LOAD_MS, getPyodide } from '../test/pyodide'
import { runPython } from './runtime'

let py: PyodideAPI
beforeAll(async () => {
  py = await getPyodide()
}, PYODIDE_LOAD_MS)

const run = (code: string, extra: { stdin?: string; files?: Record<string, string> } = {}) => runPython(py, { code, ...extra })

describe('runPython', () => {
  it('captures stdout exactly, including end="" and missing final newline', () => {
    expect(run('print("a", "b", sep="-")\nprint("c", end="")').stdout).toBe('a-b\nc')
  })

  it('captures stderr separately', () => {
    const r = run('import sys\nprint("oops", file=sys.stderr)\nprint("ok")')
    expect(r.stdout).toBe('ok\n')
    expect(r.stderr).toBe('oops\n')
  })

  it('streams output through hooks', () => {
    const seen: string[] = []
    runPython(py, { code: 'for i in range(3):\n    print(i)' }, { onStdout: (t) => seen.push(t) })
    expect(seen.join('')).toBe('0\n1\n2\n')
  })

  it('feeds input() from the stdin box and prints the prompt', () => {
    const r = run('name = input("Name? ")\nage = int(input())\nprint(name, age + 1)', { stdin: 'Ann\n41\n' })
    expect(r.stdout).toBe('Name? Ann 42\n')
    expect(r.error).toBeNull()
  })

  it('raises EOFError when stdin runs out', () => {
    expect(run('input()').error?.type).toBe('EOFError')
  })

  it('reports runtime errors trimmed to the learner lines', () => {
    const r = run('def half(n):\n    return n / 0\n\nprint(half(4))')
    expect(r.error).toMatchObject({ type: 'ZeroDivisionError', message: 'division by zero', line: 2 })
    expect(r.error?.traceback).toContain('File "main.py", line 4, in <module>')
    expect(r.error?.traceback).toContain('return n / 0')
    expect(r.error?.traceback).not.toContain('_pyodide')
    expect(r.error?.traceback).not.toContain('harness')
  })

  it('reports syntax and indentation errors with their line', () => {
    expect(run('x = 1\nif x > 0\n    print(x)').error).toMatchObject({ type: 'SyntaxError', line: 2 })
    expect(run('if True:\nprint(1)').error).toMatchObject({ type: 'IndentationError', line: 2 })
  })

  it('keeps output printed before an error', () => {
    const r = run('print("before")\nprint(undefined_name)')
    expect(r.stdout).toBe('before\n')
    expect(r.error).toMatchObject({ type: 'NameError', line: 2 })
  })

  it('treats exit() as a normal end', () => {
    expect(run('print(1)\nexit()\nprint(2)')).toMatchObject({ stdout: '1\n', error: null })
  })

  it('starts every run with fresh globals', () => {
    run('secret = 42')
    expect(run('print(secret)').error?.type).toBe('NameError')
  })

  it('seeds fixture files, returns written files and resets them per run', () => {
    const r = run('with open("notes.txt") as f:\n    print(f.read().upper(), end="")\nwith open("out.txt", "w") as f:\n    f.write("done\\n")', {
      files: { 'notes.txt': 'buy milk' },
    })
    expect(r.stdout).toBe('BUY MILK')
    expect(r.files).toEqual({ 'notes.txt': 'buy milk', 'out.txt': 'done\n' })
    expect(run('open("out.txt")').error?.type).toBe('FileNotFoundError')
  })

  it('gives repeatable results with random.seed()', () => {
    const code = 'import random\nrandom.seed(7)\nprint(random.randint(1, 100), random.choice("abc"))'
    expect(run(code).stdout).toBe(run(code).stdout)
  })
})
