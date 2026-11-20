// Content tests over the exercises: each file parses and belongs to its
// objective, uses only features its exams teach, and every model solution
// passes its own checks in Pyodide (in two instances with different hash
// seeds), while the starter code does not.
import type { PyodideAPI } from 'pyodide'
import { beforeAll, describe, expect, it } from 'vitest'
import { checkExercise } from '../exercises/check'
import { runPython } from '../python/runtime'
import { PYODIDE_LOAD_MS, getPyodidePair } from '../test/pyodide'
import { EXAM_IDS, OBJECTIVE_BY_ID, SUBPOINT_BY_ID, subpointInExam } from './blueprint'
import { EXERCISES, EXERCISE_FILES } from './exercises'
import { foreignFeatures } from './features'
import { type Exercise, exerciseFileSchema } from './schema'

let pys: [PyodideAPI, PyodideAPI]
beforeAll(async () => {
  pys = await getPyodidePair()
}, PYODIDE_LOAD_MS)

const check = (ex: Exercise, code: string, py: PyodideAPI) => checkExercise(ex, code, (req) => runPython(py, req))

const failures = (report: Awaited<ReturnType<typeof check>>) => [
  ...(report.error ? [`raised ${report.error.type}: ${report.error.message}`] : []),
  ...report.rows.filter((r) => !r.passed).map((r) => `${r.label}: ${r.details.join('; ')}`),
]

describe('exercises', () => {
  it.each(Object.entries(EXERCISE_FILES))('%s.json parses and belongs to its objective', (fileId, data) => {
    expect(OBJECTIVE_BY_ID.has(fileId), `no objective ${fileId}`).toBe(true)
    const parsed = exerciseFileSchema.safeParse(data)
    expect(parsed.success, parsed.error?.message).toBe(true)
    for (const [i, ex] of (parsed.data ?? []).entries()) {
      expect(ex.objectiveId).toBe(fileId)
      expect(ex.id, 'ids are numbered e1, e2, … in file order').toBe(`${fileId}-e${i + 1}`)
      for (const s of ex.subpoints) expect(SUBPOINT_BY_ID.has(s), `${ex.id}: unknown sub-point ${s}`).toBe(true)
    }
  })

  it('uses only features that every exam the exercise is shown on teaches', () => {
    const problems = EXERCISES.flatMap((ex) => {
      const code = [ex.starter, ex.solution, ...(ex.kind === 'function' ? ex.checks.map((c) => c.call) : [])].join('\n')
      return EXAM_IDS.filter((exam) => ex.subpoints.every((s) => subpointInExam(s, exam))).flatMap((exam) =>
        foreignFeatures(code, exam).map((f) => `${ex.id}: uses ${f}, which PCEP-${exam} doesn't teach`),
      )
    })
    expect(problems).toEqual([])
  })

  it.each(EXERCISES.map((ex) => [ex.id, ex] as const))('%s: the solution passes in both hash seeds, the starter fails', async (_, ex) => {
    for (const py of pys) expect(failures(await check(ex, ex.solution, py))).toEqual([])
    expect((await check(ex, ex.starter, pys[0])).passed, 'the starter code already passes').toBe(false)
  })
})

describe('checkExercise', () => {
  const fn = EXERCISES.find((e) => e.id === '3.1.1-e1') as Extract<Exercise, { kind: 'function' }>
  const io = EXERCISES.find((e) => e.id === '3.1.1-e2')!

  it('explains a wrong return value, a wrong type and an exception', async () => {
    const report = await check(fn, 'def ends(queue):\n    return (queue[0], queue[-1]) if len(queue) > 2 else queue[1]', pys[0])
    expect(report.passed).toBe(false)
    expect(report.rows.map((r) => r.details.join())).toEqual([
      "returned ('Ana', 'Cleo'), expected ['Ana', 'Cleo']",
      "returned 'Eli', expected ['Dev', 'Eli']",
      'raised IndexError: list index out of range',
      "returned ('Gus', 'Kim'), expected ['Gus', 'Kim']",
    ])
  })

  it('reports a program that raises before any check runs', async () => {
    const report = await check(fn, 'def ends(queue)\n    return queue', pys[0])
    expect(report).toMatchObject({ passed: false, rows: [], error: { type: 'SyntaxError' } })
  })

  it('compares output line by line, ignoring trailing spaces', async () => {
    const lines = io.kind === 'io' ? io.cases[0]!.stdout.trimEnd().split('\n') : []
    const spaced = lines.map((l) => `print(${JSON.stringify(`${l}  `)})`).join('\n')
    expect((await check(io, spaced, pys[0])).passed).toBe(true)
    const report = await check(io, 'print("[17, 20]")', pys[0])
    expect(report.rows[0]!.details[0]).toMatch(/^printed:\n\[17, 20\]\nexpected:\n\[17, 20\]\n\[18/)
  })

  it('checks printed output and raised exceptions of function calls', async () => {
    const ex: Exercise = {
      ...fn,
      checks: [
        { call: 'greet("Mo")', prints: 'Hi, Mo!' },
        { call: 'greet(3)', raises: 'TypeError' },
      ],
    }
    expect((await check(ex, 'def greet(name):\n    print("Hi, " + name + "!")', pys[0])).passed).toBe(true)
    const report = await check(ex, 'def greet(name):\n    print("Hi,", name)', pys[0])
    expect(report.rows.map((r) => r.details.join())).toEqual(['printed:\nHi, Mo\nexpected:\nHi, Mo!', 'expected TypeError, but nothing was raised'])
  })
})
