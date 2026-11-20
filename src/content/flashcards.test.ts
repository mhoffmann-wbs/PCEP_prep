// Content tests over the built-in flashcards: each file parses and belongs to
// its objective, uses only features its exams teach, and what a card says its
// code prints or raises is what Pyodide does (in two hash seeds).
import type { PyodideAPI } from 'pyodide'
import { beforeAll, describe, expect, it } from 'vitest'
import { runPython } from '../python/runtime'
import { PYODIDE_LOAD_MS, getPyodidePair } from '../test/pyodide'
import { CORE_OBJECTIVES, EXAM_IDS, EXTRA_OBJECTIVES, OBJECTIVE_BY_ID, SUBPOINT_BY_ID, subpointInExam } from './blueprint'
import { foreignFeatures } from './features'
import { CARDS, CARD_FILES } from './flashcards'
import { cardFileSchema } from './schema'

let pys: [PyodideAPI, PyodideAPI]
beforeAll(async () => {
  pys = await getPyodidePair()
}, PYODIDE_LOAD_MS)

/** Cards per objective: enough for a short review of each. */
const MIN_CARDS = { core: 4, extra: 3 }

describe('flashcards', () => {
  it.each(Object.entries(CARD_FILES))('%s.json parses and belongs to its objective', (fileId, data) => {
    expect(OBJECTIVE_BY_ID.has(fileId), `no objective ${fileId}`).toBe(true)
    const parsed = cardFileSchema.safeParse(data)
    expect(parsed.success, parsed.error?.message).toBe(true)
    for (const [i, card] of (parsed.data ?? []).entries()) {
      expect(card.objectiveId).toBe(fileId)
      expect(card.id, 'ids are numbered c01, c02, … in file order').toBe(`${fileId}-c${String(i + 1).padStart(2, '0')}`)
      for (const s of card.subpoints) expect(SUBPOINT_BY_ID.has(s), `${card.id}: unknown sub-point ${s}`).toBe(true)
    }
  })

  it('has cards for every objective', () => {
    const count = (id: string) => CARDS.filter((c) => c.objectiveId === id).length
    const short = [
      ...CORE_OBJECTIVES.filter((o) => count(o.id) < MIN_CARDS.core),
      ...EXTRA_OBJECTIVES.filter((o) => count(o.id) < MIN_CARDS.extra),
    ].map((o) => `${o.id}: ${count(o.id)}`)
    expect(short).toEqual([])
  })

  it('uses only features that every exam the card is shown on teaches', () => {
    const problems = CARDS.flatMap((card) =>
      EXAM_IDS.filter((exam) => card.subpoints.every((s) => subpointInExam(s, exam))).flatMap((exam) =>
        foreignFeatures(card.code ?? '', exam).map((f) => `${card.id}: uses ${f}, which PCEP-${exam} doesn't teach`),
      ),
    )
    expect(problems).toEqual([])
  })

  it.each(CARDS.filter((c) => c.code).map((c) => [c.id, c] as const))('%s: the code does what the card says, in both hash seeds', (_, card) => {
    const [a, b] = pys.map((py) => runPython(py, { code: card.code! })).map((r) => ({ stdout: r.stdout, error: r.error?.type ?? null }))
    expect(a).toEqual(b)
    // Code without a stated output must run without an error (its output isn't claimed).
    const claimed = card.output !== undefined || card.raises
    expect(claimed ? a : { ...a!, stdout: '' }).toEqual({ stdout: card.output ?? '', error: card.raises ?? null })
  })
})
