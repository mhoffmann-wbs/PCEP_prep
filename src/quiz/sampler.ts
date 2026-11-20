// Builds practice sets and mock exams from the question bank.
import { EXAM_PROFILES, EXTRA_OBJECTIVES, type ExamId } from '../content/blueprint'
import { itemInExam } from '../content/bank'
import type { Item } from '../content/schema'
import { type Rng, shuffle } from './random'

export interface MockExam {
  exam: ExamId
  /** The 30-03 mock with one extra item per 30-02 extra objective. */
  extended: boolean
  items: Item[]
  minutes: number
  /** How many items short of the full length the bank currently is. */
  shortfall: number
}

/**
 * Picks `count` items from `pool`, spreading them over `objectiveIds` and
 * preferring items the learner has not seen in earlier mocks.
 */
function spread(pool: readonly Item[], objectiveIds: readonly string[], count: number, seen: ReadonlySet<string>, rng: Rng): Item[] {
  const queues = new Map<string, Item[]>(
    objectiveIds.map((id) => {
      const items = shuffle(
        pool.filter((i) => i.objectiveId === id),
        rng,
      )
      return [id, [...items.filter((i) => !seen.has(i.id)), ...items.filter((i) => seen.has(i.id))]]
    }),
  )
  const picked: Item[] = []
  const order = shuffle(objectiveIds, rng)
  while (picked.length < count) {
    const before = picked.length
    for (const id of order) {
      const next = queues.get(id)!.shift()
      if (next && picked.length < count) picked.push(next)
    }
    if (picked.length === before) break
  }
  return picked
}

/**
 * Builds a mock exam. 30-03: one item per objective, as on the real exam (plus
 * one per extra objective when extended). 30-02: each block's syllabus item count
 * from its pool. When the bank is short, the time limit is scaled to the real pace.
 */
export function buildMockExam(
  bank: readonly Item[],
  exam: ExamId,
  extended: boolean,
  seen: ReadonlySet<string> = new Set(),
  rng: Rng = Math.random,
): MockExam {
  const profile = EXAM_PROFILES[exam]
  const pool = bank.filter((i) => itemInExam(i, exam))
  const picked: Item[] = []
  let target = 0
  if (exam === '30-03') {
    for (const s of profile.sections) for (const id of s.objectiveIds) picked.push(...spread(pool, [id], 1, seen, rng))
    target = profile.items
    if (extended) {
      const extras = bank.filter((i) => itemInExam(i, '30-02'))
      for (const o of EXTRA_OBJECTIVES) picked.push(...spread(extras, [o.id], 1, seen, rng))
      target += EXTRA_OBJECTIVES.length
    }
  } else {
    for (const s of profile.sections) picked.push(...spread(pool, s.objectiveIds, s.items, seen, rng))
    target = profile.items
  }
  const items = shuffle(picked, rng)
  return {
    exam,
    extended: exam === '30-03' && extended,
    items,
    minutes: Math.max(1, Math.round((profile.minutes * items.length) / profile.items)),
    shortfall: target - items.length,
  }
}

/**
 * Draws an untimed mixed practice set. It samples without replacement, with each
 * objective's chance proportional to its blueprint weight (not its pool size), so
 * short sets match the blueprint on average and every objective shows up over a
 * few sessions.
 */
export function buildMixedSet(pool: readonly Item[], weights: ReadonlyMap<string, number>, size: number, rng: Rng = Math.random): Item[] {
  const poolSize = new Map<string, number>()
  for (const i of pool) poolSize.set(i.objectiveId, (poolSize.get(i.objectiveId) ?? 0) + 1)
  // Efraimidis–Spirakis: key = u^(1/w); the largest keys form a weighted sample.
  const keyed = pool.map((item) => {
    const w = (weights.get(item.objectiveId) ?? 0) / (poolSize.get(item.objectiveId) ?? 1)
    return { item, key: w > 0 ? Math.pow(rng(), 1 / w) : -1 }
  })
  keyed.sort((a, b) => b.key - a.key)
  return shuffle(
    keyed.slice(0, size).map((k) => k.item),
    rng,
  )
}

/**
 * A "least mastered" mixed set: per-objective counts come from the same weighted
 * draw as `buildMixedSet`; within each objective, the items with the lowest
 * correct-answer streak are chosen (never answered counts as 0).
 */
export function buildFocusSet(
  pool: readonly Item[],
  weights: ReadonlyMap<string, number>,
  size: number,
  streakOf: (itemId: string) => number,
  rng: Rng = Math.random,
): Item[] {
  const perObjective = new Map<string, number>()
  for (const i of buildMixedSet(pool, weights, size, rng)) perObjective.set(i.objectiveId, (perObjective.get(i.objectiveId) ?? 0) + 1)
  const picked = [...perObjective].flatMap(([id, count]) =>
    orderLeastMastered(
      pool.filter((i) => i.objectiveId === id),
      streakOf,
      rng,
    ).slice(0, count),
  )
  return shuffle(picked, rng)
}

/** Orders a whole pool lowest streak first, in random order within each streak. */
export function orderLeastMastered(pool: readonly Item[], streakOf: (itemId: string) => number, rng: Rng = Math.random): Item[] {
  // Array.prototype.sort is stable, so the shuffle survives within each streak.
  return shuffle(pool, rng).sort((a, b) => streakOf(a.id) - streakOf(b.id))
}
