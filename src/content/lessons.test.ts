// Lesson content tests: structure, syllabus coverage, and every code snippet
// checked against real Python (Pyodide), never trusted from memory.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { PyodideAPI } from 'pyodide'
import { beforeAll, describe, expect, it } from 'vitest'
import { PYODIDE_LOAD_MS, getPyodidePair } from '../test/pyodide'
import { EXAM_IDS, OBJECTIVE_BY_ID, objectiveInExam } from './blueprint'
import { FEATURE_HOME, foreignFeatures } from './features'
import { LESSONS, REQUIRED_SECTIONS } from './lessons'
import { checkSnippet as checkIn } from './snippetCheck'
import { type Snippet, extractSnippets } from './snippets'

const checkSnippet = (s: Snippet) => checkIn(s, pys)

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
