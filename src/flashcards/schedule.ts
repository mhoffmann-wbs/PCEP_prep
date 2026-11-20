// Spaced review with Leitner boxes. A card rated Good moves up one box and Easy
// two; Again sends it back to box 0. The box sets how many days pass before the
// card is due again, counted from the start of today, so a card due "in 1 day"
// is due all of tomorrow.
import type { CardStat } from '../progress/store'

export type Rating = 'again' | 'good' | 'easy'

/** Days until a card in each box is due again. */
export const INTERVAL_DAYS = [0, 1, 3, 7, 16, 35] as const

const TOP_BOX = INTERVAL_DAYS.length - 1

/** From this box on, a card counts as learned. */
export const LEARNED_BOX = 3

/** New cards added to one review session, after the due ones. */
export const NEW_PER_SESSION = 10

const DAY_MS = 86_400_000

const startOfDay = (at: number) => new Date(at).setHours(0, 0, 0, 0)

/** The box a card moves to. A new card starts as if it were in box 0. */
export function nextBox(stat: CardStat | undefined, rating: Rating): number {
  if (rating === 'again') return 0
  return Math.min(TOP_BOX, (stat?.box ?? 0) + (rating === 'easy' ? 2 : 1))
}

export function rate(stat: CardStat | undefined, rating: Rating, now: number): CardStat {
  const box = nextBox(stat, rating)
  const days = INTERVAL_DAYS[box]!
  return {
    box,
    due: rating === 'again' ? now : startOfDay(now) + days * DAY_MS,
    reviews: (stat?.reviews ?? 0) + 1,
    lapses: (stat?.lapses ?? 0) + (rating === 'again' && stat && stat.box >= LEARNED_BOX ? 1 : 0),
    lastAt: now,
  }
}

/** "now", "1 day", "3 days": when a card rated this way comes back. */
export function intervalLabel(stat: CardStat | undefined, rating: Rating): string {
  if (rating === 'again') return 'now'
  const days = INTERVAL_DAYS[nextBox(stat, rating)]!
  return days === 1 ? '1 day' : `${days} days`
}

export const isDue = (stat: CardStat | undefined, now: number) => stat !== undefined && stat.due <= now

export interface DeckCounts {
  total: number
  /** Never reviewed. */
  fresh: number
  due: number
  learned: number
}

export function countCards(ids: readonly string[], stats: Record<string, CardStat>, now: number): DeckCounts {
  const counts = { total: ids.length, fresh: 0, due: 0, learned: 0 }
  for (const id of ids) {
    const stat = stats[id]
    if (!stat) counts.fresh++
    else {
      if (stat.due <= now) counts.due++
      if (stat.box >= LEARNED_BOX) counts.learned++
    }
  }
  return counts
}

/**
 * The cards for one review session: the due ones (longest overdue first), then
 * up to `newLimit` new ones in deck order. With `everything`, every card in deck
 * order, due or not (to go through a deck now).
 */
export function buildQueue(
  ids: readonly string[],
  stats: Record<string, CardStat>,
  now: number,
  { newLimit = NEW_PER_SESSION, everything = false }: { newLimit?: number; everything?: boolean } = {},
): string[] {
  if (everything) return [...ids]
  const due = ids.filter((id) => isDue(stats[id], now)).sort((a, b) => stats[a]!.due - stats[b]!.due)
  const fresh = ids.filter((id) => !stats[id]).slice(0, newLimit)
  return [...due, ...fresh]
}
