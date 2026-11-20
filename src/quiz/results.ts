// Scores a finished mock exam by section and objective.
import { EXAM_PROFILES, type ExamId, OBJECTIVE_BY_ID } from '../content/blueprint'
import type { Item } from '../content/schema'

export interface ScoreRow {
  id: string
  label: string
  correct: number
  total: number
}

export interface MockScore {
  correct: number
  total: number
  percent: number
  passed: boolean
  sections: ScoreRow[]
  objectives: ScoreRow[]
  /** 30-03 extended mock only: the 30-02 extras, kept out of the section rows. */
  extras: ScoreRow | null
}

const percent = (correct: number, total: number) => (total === 0 ? 0 : Math.round((correct / total) * 100))

export function scoreMock(exam: ExamId, items: Item[], correct: (item: Item) => boolean): MockScore {
  const profile = EXAM_PROFILES[exam]
  const row = (id: string, label: string, xs: Item[]): ScoreRow => ({ id, label, correct: xs.filter(correct).length, total: xs.length })
  const sectionOf = (item: Item) => profile.sections.find((s) => s.objectiveIds.includes(item.objectiveId))

  const extraItems = exam === '30-03' ? items.filter((i) => !sectionOf(i)) : []
  const sections = profile.sections.map((s) => row(s.id, s.title, items.filter((i) => sectionOf(i)?.id === s.id)))
  const objectiveIds = [...new Set(items.map((i) => i.objectiveId))]
  const objectives = objectiveIds.map((id) => row(id, OBJECTIVE_BY_ID.get(id)?.title ?? id, items.filter((i) => i.objectiveId === id)))

  const scored = items.filter((i) => !extraItems.includes(i))
  const right = scored.filter(correct).length
  return {
    correct: right,
    total: scored.length,
    percent: percent(right, scored.length),
    passed: percent(right, scored.length) >= profile.passPercent,
    sections,
    objectives,
    extras: extraItems.length ? row('x', 'PCEP-30-02 extras', extraItems) : null,
  }
}

export { percent }
