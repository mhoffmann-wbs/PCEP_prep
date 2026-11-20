// Content tests over the real question bank. They pass vacuously while the bank
// is empty and guard every file as it is added.
import { describe, expect, it } from 'vitest'
import { EXAM_IDS, OBJECTIVE_BY_ID, SUBPOINT_BY_ID } from './blueprint'
import { foreignFeatures } from './features'
import { ITEMS, QUESTION_FILES, itemInExam } from './bank'
import { QUALITY_CHECKS } from './quality'
import { type Item, completeProgram, itemFileSchema } from './schema'

describe('question bank', () => {
  it.each(Object.entries(QUESTION_FILES))('%s.json parses and belongs to its objective', (fileId, data) => {
    expect(OBJECTIVE_BY_ID.has(fileId), `no objective ${fileId}`).toBe(true)
    const parsed = itemFileSchema.safeParse(data)
    expect(parsed.success, parsed.error?.message).toBe(true)
    for (const item of parsed.data ?? []) {
      expect(item.objectiveId).toBe(fileId)
      for (const s of item.subpoints) expect(SUBPOINT_BY_ID.has(s), `${item.id}: unknown sub-point ${s}`).toBe(true)
    }
  })

  // Every piece of code the learner sees or that runs. Options that are printed
  // output (single items with outputKey) are not code, so they are skipped.
  const codeOf = (item: Item) =>
    [
      completeProgram(item) ?? item.code ?? '',
      ...(item.kind === 'insert' || (item.kind === 'single' && item.code && !item.outputKey) ? item.options.map((o) => o.text) : []),
      ...(item.kind === 'gap' ? item.blanks.flatMap((b) => (b.kind === 'text' ? b.accept : b.choices)) : []),
    ].join('\n')

  it('uses only features that every exam the item is shown on teaches', () => {
    const problems = ITEMS.flatMap((item) =>
      EXAM_IDS.filter((exam) => itemInExam(item, exam)).flatMap((exam) =>
        foreignFeatures(codeOf(item), exam).map((f) => `${item.id}: uses ${f}, which PCEP-${exam} doesn't teach (tag the 30-03-only sub-point, or avoid it)`),
      ),
    )
    expect(problems).toEqual([])
  })

  it('has unique item ids', () => {
    const ids = ITEMS.map((i) => i.id)
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([])
  })

  it.each(Object.entries(QUALITY_CHECKS))('passes the %s check', (_, check) => {
    expect(check(ITEMS)).toEqual([])
  })
})
