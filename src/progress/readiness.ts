import type { Objective } from '../content/blueprint'
import type { Item } from '../content/schema'
import type { ItemStat, Progress } from './store'

export interface ObjectiveReadiness {
  objectiveId: string
  /** Share of the objective's items answered at least once. */
  coverage: number
  /** Share of attempted items whose latest answer was correct (0 if none attempted). */
  accuracy: number
  /** coverage × accuracy: what fraction of the objective's pool you can currently answer. */
  readiness: number
}

export function objectiveReadiness(objectives: readonly Objective[], pool: readonly Item[], progress: Progress): ObjectiveReadiness[] {
  return objectives.map((o) => {
    const items = pool.filter((i) => i.objectiveId === o.id)
    const attempted = items.filter((i) => progress.items[i.id])
    const correct = attempted.filter((i) => progress.items[i.id]!.lastCorrect)
    const coverage = items.length ? attempted.length / items.length : 0
    const accuracy = attempted.length ? correct.length / attempted.length : 0
    return { objectiveId: o.id, coverage, accuracy, readiness: coverage * accuracy }
  })
}

/** Overall readiness, weighted by the blueprint's objective weights. */
export function weightedReadiness(rows: readonly ObjectiveReadiness[], weights: ReadonlyMap<string, number>): number {
  const total = rows.reduce((sum, r) => sum + (weights.get(r.objectiveId) ?? 0), 0)
  if (total === 0) return 0
  return rows.reduce((sum, r) => sum + r.readiness * (weights.get(r.objectiveId) ?? 0), 0) / total
}

/**
 * Weak-area drill: items from the lowest-readiness objectives, preferring items
 * never attempted or last answered wrong. Heavier objectives win ties.
 */
export function weakAreaItems(
  objectives: readonly Objective[],
  pool: readonly Item[],
  progress: Progress,
  weights: ReadonlyMap<string, number>,
  objectiveCount = 5,
  size = 15,
): Item[] {
  const weakest = objectiveReadiness(
    objectives.filter((o) => pool.some((i) => i.objectiveId === o.id)),
    pool,
    progress,
  )
    .sort((a, b) => a.readiness - b.readiness || (weights.get(b.objectiveId) ?? 0) - (weights.get(a.objectiveId) ?? 0))
    .slice(0, objectiveCount)
    .map((r) => r.objectiveId)
  return pool.filter((i) => weakest.includes(i.objectiveId) && !progress.items[i.id]?.lastCorrect).slice(0, size)
}

export type Mastery = 'untested' | 'recentError' | 'reviewed' | 'alwaysCorrect'

/** Display order: the levels that need attention first. */
export const MASTERY_LEVELS: { id: Mastery; label: string; tone: string }[] = [
  { id: 'recentError', label: 'Recent error', tone: 'border-red-600 bg-red-50' },
  { id: 'reviewed', label: 'Past error, since correct', tone: 'border-amber-300 bg-amber-50' },
  { id: 'untested', label: 'Not tested', tone: 'border-slate-300 bg-slate-100' },
  { id: 'alwaysCorrect', label: 'Always correct', tone: 'border-green-600 bg-green-50' },
]

/** One item's mastery, from its latest answer and whether it was ever missed. */
export function masteryOf(stat: ItemStat | undefined): Mastery {
  if (!stat || stat.attempts === 0) return 'untested'
  if (!stat.lastCorrect) return 'recentError'
  return stat.correct < stat.attempts ? 'reviewed' : 'alwaysCorrect'
}
