// Content tests over the real question bank. They pass vacuously while the bank
// is empty and guard every file as it is added.
import { describe, expect, it } from 'vitest'
import { OBJECTIVE_BY_ID, SUBPOINT_BY_ID } from './blueprint'
import { ITEMS, QUESTION_FILES } from './bank'
import { QUALITY_CHECKS } from './quality'
import { itemFileSchema } from './schema'

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

  it('has unique item ids', () => {
    const ids = ITEMS.map((i) => i.id)
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([])
  })

  it.each(Object.entries(QUALITY_CHECKS))('passes the %s check', (_, check) => {
    expect(check(ITEMS)).toEqual([])
  })
})
