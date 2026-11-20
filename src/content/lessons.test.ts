// Lesson content tests: structure, syllabus coverage, and every code snippet
// checked against real Python (Pyodide), never trusted from memory.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { PyodideAPI } from 'pyodide'
import { beforeAll, describe, expect, it } from 'vitest'
import { runPython } from '../python/runtime'
import { PYODIDE_LOAD_MS, getPyodidePair } from '../test/pyodide'
import { EXAM_IDS, OBJECTIVE_BY_ID, objectiveInExam } from './blueprint'
import { FEATURE_HOME, foreignFeatures } from './features'
import { LESSONS, REQUIRED_SECTIONS } from './lessons'
import { type Snippet, extractSnippets } from './snippets'

// Read the raw MDX from disk: the MDX plugin would compile a `?raw` import.
const dir = join(import.meta.dirname, 'lessons')
const SOURCES = Object.fromEntries(
  readdirSync(dir)
    .filter((f) => f.endsWith('.mdx'))
    .map((f) => [f.replace(/\.mdx$/, ''), readFileSync(join(dir, f), 'utf8')]),
)

let pys: [PyodideAPI, PyodideAPI]
beforeAll(async () => {
  pys = await getPyodidePair()
}, PYODIDE_LOAD_MS)

const lastLine = (s: string) => s.trimEnd().split('\n').at(-1) ?? ''

/** Problems with one snippet: its claim must match real Python, in both hash seeds. */
function checkSnippet(s: Snippet): string[] {
  const [a, b] = pys.map((py) => runPython(py, { code: s.code, stdin: s.stdin }))
  const where = `snippet at line ${s.line}`
  const problems: string[] = []
  const errorLine = a!.error ? lastLine(a!.error.traceback) : null
  if (a!.stdout !== b!.stdout || errorLine !== (b!.error ? lastLine(b!.error.traceback) : null))
    problems.push(`${where}: output is not deterministic`)
  if (s.error !== undefined) {
    if (errorLine !== s.error.trim()) problems.push(`${where}: raises ${JSON.stringify(errorLine)}, lesson says ${JSON.stringify(s.error.trim())}`)
  } else {
    if (errorLine) problems.push(`${where}: unexpected error ${JSON.stringify(errorLine)}`)
    if (s.output !== undefined && a!.stdout.replace(/\n$/, '') !== s.output)
      problems.push(`${where}: prints ${JSON.stringify(a!.stdout)}, lesson says ${JSON.stringify(s.output)}`)
  }
  return problems
}

it('every objective has a lesson', () => {
  expect([...OBJECTIVE_BY_ID.keys()].filter((id) => !LESSONS.has(id))).toEqual([])
})

describe.each(Object.entries(SOURCES))('lesson %s', (fileId, source) => {
  const lesson = LESSONS.get(fileId)

  it('is named after its objective and covers every sub-point', () => {
    expect(lesson, `${fileId}.mdx must export meta with objectiveId '${fileId}'`).toBeDefined()
    const objective = OBJECTIVE_BY_ID.get(fileId)
    expect(objective, `no objective ${fileId}`).toBeDefined()
    expect([...lesson!.meta.subpointsCovered].sort()).toEqual(objective!.subpoints.map((s) => s.id).sort())
  })

  it('has the required sections in order', () => {
    const positions = REQUIRED_SECTIONS.map((heading) => source.indexOf(`\n${heading}\n`))
    expect(
      REQUIRED_SECTIONS.filter((_, i) => positions[i]! < 0),
      'missing sections',
    ).toEqual([])
    expect([...positions].sort((x, y) => x - y), 'sections out of order').toEqual(positions)
  })

  it('has 2–3 predict-the-output checks, each with code and an answer', () => {
    const start = source.indexOf('\n## Predict the output\n')
    const end = source.indexOf('\n## Common mistakes\n')
    const section = source.slice(start, end)
    const blocks = section.split('<Predict>').slice(1)
    expect(blocks.length).toBeGreaterThanOrEqual(2)
    expect(blocks.length).toBeLessThanOrEqual(3)
    for (const block of blocks) {
      const snippet = extractSnippets(block.split('</Predict>')[0]!)[0]
      expect(snippet?.output ?? snippet?.error, 'each Predict needs a ```python block and an ```output or ```error block').toBeDefined()
    }
  })

  it('uses only features that every exam the objective is on teaches', () => {
    const objective = OBJECTIVE_BY_ID.get(fileId)!
    const problems = EXAM_IDS.filter((exam) => objectiveInExam(objective, exam)).flatMap((exam) =>
      extractSnippets(source).flatMap((s) =>
        foreignFeatures(s.code, exam)
          .filter((f) => !FEATURE_HOME[f].includes(fileId))
          .map((f) => `line ${s.line}: ${f} is not on PCEP-${exam}`),
      ),
    )
    expect(problems).toEqual([])
  })

  it('every code snippet does what the lesson says', () => {
    const snippets = extractSnippets(source)
    expect(snippets.length).toBeGreaterThan(0)
    expect(snippets.flatMap(checkSnippet)).toEqual([])
  })
})
