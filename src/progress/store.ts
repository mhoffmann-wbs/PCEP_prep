import { useSyncExternalStore } from 'react'
import { z } from 'zod'
import { EXAM_IDS, type ExamId } from '../content/blueprint'

// All persisted learner state lives behind this module. Bump VERSION and add a
// migration in `load()` whenever the shape changes; never read localStorage elsewhere.
const STORAGE_KEY = 'pcep101:progress'
const VERSION = 1

export interface ItemStat {
  attempts: number
  correct: number
  lastCorrect: boolean
  lastAt: number
  /** Consecutive correct answers; a wrong answer resets it to 0. */
  streak: number
}

export interface ScoreRowRecord {
  id: string
  correct: number
  total: number
}

export interface MockResult {
  at: number
  exam: ExamId
  /** The 30-03 mock included the 30-02 extras. */
  extended: boolean
  correct: number
  total: number
  percent: number
  passed: boolean
  sections: ScoreRowRecord[]
  extras: ScoreRowRecord | null
}

export interface Progress {
  version: typeof VERSION
  /** The exam the learner is preparing for. */
  track: ExamId
  /** Include the 30-02-only extras in practice pools and the question bank. */
  extrasInPractice: boolean
  /** Add the 30-02-only extras to the 30-03 mock (always on for the 30-02 mock). */
  extrasInMock: boolean
  items: Record<string, ItemStat>
  mockResults: MockResult[]
  /** Objective ids whose lesson the learner marked as read. */
  lessonsRead: string[]
  playgroundCode: string | null
}

/** Toggle defaults follow the track: off for 30-03, on for 30-02. */
export const trackDefaults = (track: ExamId) => ({ extrasInPractice: track === '30-02', extrasInMock: track === '30-02' })

function empty(): Progress {
  return {
    version: VERSION,
    track: '30-03',
    ...trackDefaults('30-03'),
    items: {},
    mockResults: [],
    lessonsRead: [],
    playgroundCode: null,
  }
}

function load(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return empty()
    const parsed = JSON.parse(raw) as { version?: number }
    if (parsed.version !== VERSION) return empty()
    return { ...empty(), ...parsed } as Progress
  } catch {
    return empty()
  }
}

let state: Progress = load()
const listeners = new Set<() => void>()

function commit(next: Progress) {
  state = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage can be unavailable (private mode, quota); keep in-memory state.
  }
  listeners.forEach((l) => l())
}

export function getProgress(): Progress {
  return state
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => void listeners.delete(listener)
}

export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, getProgress)
}

export function recordAnswer(itemId: string, correct: boolean, at: number = Date.now()) {
  const prev = state.items[itemId] ?? { attempts: 0, correct: 0, lastCorrect: false, lastAt: 0, streak: 0 }
  commit({
    ...state,
    items: {
      ...state.items,
      [itemId]: {
        attempts: prev.attempts + 1,
        correct: prev.correct + (correct ? 1 : 0),
        lastCorrect: correct,
        lastAt: at,
        streak: correct ? prev.streak + 1 : 0,
      },
    },
  })
}

export function recordMockResult(result: MockResult) {
  commit({ ...state, mockResults: [...state.mockResults, result] })
}

/** Switching tracks resets both extras toggles to the new track's defaults. */
export function setTrack(track: ExamId) {
  commit({ ...state, track, ...trackDefaults(track) })
}

export function setExtras(which: 'extrasInPractice' | 'extrasInMock', on: boolean) {
  commit({ ...state, [which]: on })
}

export function setLessonRead(objectiveId: string, read: boolean) {
  const others = state.lessonsRead.filter((id) => id !== objectiveId)
  commit({ ...state, lessonsRead: read ? [...others, objectiveId] : others })
}

export function setPlaygroundCode(code: string | null) {
  commit({ ...state, playgroundCode: code })
}

// Imports come from files people pick, so they are validated in full before replacing anything.
const count = z.number().int().nonnegative()
const row = z.object({ id: z.string(), correct: count, total: count })
const examId = z.enum(EXAM_IDS as [ExamId, ...ExamId[]])
const ProgressSchema = z.object({
  version: z.literal(VERSION),
  track: examId,
  extrasInPractice: z.boolean(),
  extrasInMock: z.boolean(),
  items: z.record(
    z.string(),
    z.object({ attempts: count, correct: count, lastCorrect: z.boolean(), lastAt: z.number(), streak: count }),
  ),
  mockResults: z.array(
    z.object({
      at: z.number(),
      exam: examId,
      extended: z.boolean(),
      correct: count,
      total: count,
      percent: z.number(),
      passed: z.boolean(),
      sections: z.array(row),
      extras: row.nullable(),
    }),
  ),
  lessonsRead: z.array(z.string()),
  playgroundCode: z.string().nullable(),
})

const EXPORT_APP = 'pcep101'

/** The learner's progress as a JSON document they can save and import elsewhere. */
export function exportProgress(at: Date = new Date()): string {
  return JSON.stringify({ app: EXPORT_APP, exportedAt: at.toISOString(), progress: state }, null, 2)
}

/**
 * Replaces all progress with the contents of an export.
 * Throws an Error with a message for the learner if the file isn't a usable export.
 */
export function importProgress(json: string) {
  let doc: { app?: unknown; progress?: { version?: unknown } }
  try {
    doc = JSON.parse(json)
  } catch {
    throw new Error("This file isn't valid JSON.")
  }
  if (doc?.app !== EXPORT_APP || typeof doc.progress !== 'object' || doc.progress === null) {
    throw new Error("This file isn't a PCEP101 progress export.")
  }
  const { version } = doc.progress
  if (typeof version === 'number' && version > VERSION) {
    throw new Error('This export comes from a newer version of the app. Reload the app, then import it again.')
  }
  const result = ProgressSchema.safeParse({ ...empty(), ...doc.progress })
  if (!result.success) throw new Error('This export is damaged or incomplete, so nothing was imported.')
  commit(result.data)
}

export function resetProgress() {
  commit(empty())
}

/** Re-read from storage. Used by tests after manipulating localStorage directly. */
export function reloadProgress() {
  state = load()
  listeners.forEach((l) => l())
}
