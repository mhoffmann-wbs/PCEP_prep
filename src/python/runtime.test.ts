import type { PyodideAPI } from 'pyodide'
import { beforeAll, describe, expect, it } from 'vitest'
import { PYODIDE_LOAD_MS, getPyodide } from '../test/pyodide'
import { STEP_LIMIT } from '../visualizer/trace'
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

  it('keeps input() working after a program calls exit() or quit()', () => {
    run('exit()')
    run('quit()')
    expect(run('print(input())', { stdin: 'still here' })).toMatchObject({ stdout: 'still here\n', error: null })
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

describe('runPython with trace', () => {
  const trace = (code: string, stdin?: string) => {
    const r = runPython(py, { code, stdin, trace: true })
    return { ...r, steps: r.trace!.steps, truncated: r.trace!.truncated }
  }
  const vars = (step: { frames: { name: string; vars: { name: string; value: string }[] }[] }) =>
    Object.fromEntries(step.frames.map((f) => [f.name, Object.fromEntries(f.vars.map((v) => [v.name, v.value]))]))

  it('records a step before each line, with globals as they are before it runs', () => {
    const { steps, error } = trace('x = 1\nx = x + 1\nprint(x)')
    expect(error).toBeNull()
    expect(steps.map((s) => [s.event, s.line])).toEqual([['line', 1], ['line', 2], ['line', 3], ['end', null]])
    expect(vars(steps[1]!)).toEqual({ Global: { x: '1' } })
    expect(steps.map((s) => s.out)).toEqual(['', '', '', '2\n'])
  })

  it('shows function frames and return values', () => {
    const { steps } = trace('def double(n):\n    return n * 2\n\nresult = double(4)\nprint(result)')
    const inside = steps.find((s) => s.line === 2)!
    expect(inside.frames.map((f) => f.name)).toEqual(['Global', 'double'])
    expect(vars(inside).double).toEqual({ n: '4' })
    expect(vars(inside).Global).toEqual({ double: 'function double' })
    expect(steps.find((s) => s.event === 'return')).toMatchObject({ line: 2, detail: '8' })
    expect(vars(steps.at(-1)!).Global!.result).toBe('8')
  })

  it('numbers lists so aliases share a number and copies get a new one', () => {
    const { steps } = trace('a = [1, 2]\nb = a\nc = a[:]\nb.append(3)\nprint(a)')
    const g = steps.at(-1)!.frames[0]!.vars
    const ref = (name: string) => g.find((v) => v.name === name)!.ref
    expect(ref('a')).toBe(ref('b'))
    expect(ref('c')).not.toBe(ref('a'))
    expect(g.find((v) => v.name === 'a')!.value).toBe('[1, 2, 3]')
    expect(g.find((v) => v.name === 'c')).toMatchObject({ value: '[1, 2]', type: 'list' })
  })

  it('records a caught exception, then the except branch', () => {
    const { steps, error } = trace('try:\n    n = int("x")\nexcept ValueError:\n    n = 0\nprint(n)')
    expect(error).toBeNull()
    const i = steps.findIndex((s) => s.event === 'exception')
    expect(steps[i]).toMatchObject({ line: 2, detail: "ValueError: invalid literal for int() with base 10: 'x'" })
    expect(steps.slice(i + 1).map((s) => s.line)).toEqual([3, 4, 5, null])
  })

  it('ends with an error step and no fake return when an exception escapes a function', () => {
    const { steps, error } = trace('def f():\n    return 1 / 0\n\nf()')
    expect(error?.type).toBe('ZeroDivisionError')
    expect(steps.some((s) => s.event === 'return')).toBe(false)
    expect(steps.at(-1)).toMatchObject({ event: 'error', line: 2, detail: 'ZeroDivisionError: division by zero' })
  })

  it('reports a syntax error as a single error step', () => {
    const { steps, error } = trace('print("hi"')
    expect(error?.type).toBe('SyntaxError')
    expect(steps).toHaveLength(1)
    expect(steps[0]).toMatchObject({ event: 'error', line: 1 })
  })

  it('reads input() from stdin and keeps the prompt in the output', () => {
    const { steps } = trace('name = input("Name? ")\nprint("Hi", name)', 'Ana')
    expect(steps.map((s) => s.out).join('')).toBe('Name? Hi Ana\n')
    expect(vars(steps.at(-1)!).Global!.name).toBe("'Ana'")
  })

  it('stops an endless loop at the step limit', () => {
    const { steps, truncated, error } = trace('n = 0\nwhile True:\n    n += 1')
    expect(truncated).toBe(true)
    expect(error).toBeNull()
    expect(steps).toHaveLength(STEP_LIMIT)
  })

  it('does not let learner code catch the step limit', () => {
    const { truncated } = trace('while True:\n    try:\n        pass\n    except Exception:\n        pass')
    expect(truncated).toBe(true)
  })

  it('leaves normal runs untraced', () => {
    expect(run('print(1)').trace).toBeNull()
  })
})
