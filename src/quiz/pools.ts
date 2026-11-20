// Which objectives and items the learner practises, given their exam track and
// the "include 30-02 topics in practice" toggle.
import { EXAM_PROFILES, OBJECTIVES, type Objective, objectiveInExam } from '../content/blueprint'
import { itemInExam } from '../content/bank'
import type { Item } from '../content/schema'
import type { Progress } from '../progress/store'

type Settings = Pick<Progress, 'track' | 'extrasInPractice'>

const isExtra = (objectiveId: string) => objectiveId.startsWith('x.')

export function practiceObjectives({ track, extrasInPractice }: Settings): Objective[] {
  return OBJECTIVES.filter((o) => (isExtra(o.id) ? extrasInPractice : objectiveInExam(o, track)))
}

export function practicePool(bank: readonly Item[], { track, extrasInPractice }: Settings): Item[] {
  return bank.filter((i) => (isExtra(i.objectiveId) ? extrasInPractice : itemInExam(i, track)))
}

/**
 * Blueprint weight of each objective: its section's weight shared equally among
 * the section's objectives. Extras outside the track's sections get the average.
 */
export function objectiveWeights({ track }: Pick<Progress, 'track'>): Map<string, number> {
  const weights = new Map<string, number>()
  for (const s of EXAM_PROFILES[track].sections) for (const id of s.objectiveIds) weights.set(id, s.weight / s.objectiveIds.length)
  const average = 100 / weights.size
  for (const o of OBJECTIVES) if (!weights.has(o.id)) weights.set(o.id, average)
  return weights
}
