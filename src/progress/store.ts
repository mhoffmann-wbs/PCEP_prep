import { useSyncExternalStore } from 'react'
import { z } from 'zod'
import { EXAM_IDS, type ExamId } from '../content/blueprint'

// All persisted learner state lives behind this module. Bump VERSION and add a
// migration in `load()` whenever the shape changes; never read localStorage elsewhere.
const STORAGE_KEY = 'pcep101:progress'
const VERSION = 3

export interface ItemStat {
  attempts: number
  correct: number
  lastCorrect: boolean
  lastAt: number
  /** Consecutive correct answers; a wrong answer resets it to 0. */
  streak: number
}

export interface ExerciseStat {
  /** Times the learner pressed Check. */
  attempts: number
  /** When the checks first all passed (null while unsolved). Stays set after a later failed attempt. */
  solvedAt: number | null
  /** The learner's latest code, so a half-done exercise survives a reload. */
  code: string | null
}

/** Spaced-review state of one flashcard (built-in or the learner's own). */
export interface CardStat {
  /** Leitner box 0–5: the higher the box, the longer until the card comes back. */
  box: number
  /** When the card is next due (ms since epoch). */
  due: number
  reviews: number
  /** Times the card was rated Again after it had been learned once. */
  lapses: number
  lastAt: number
}

/** A deck of the learner's own flashcards. */
export interface UserDeck {
  id: string
  name: string
  createdAt: number
}

export interface UserCard {
  id: string
  deckId: string
  front: string
  back: string
  /** Optional Python shown under the question. */
  code: string | null
  createdAt: number
  updatedAt: number
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
  exercises: Record<string, ExerciseStat>
  playgroundCode: string | null
  /** Review state per flashcard id, for built-in and own cards. */
  cards: Record<string, CardStat>
  decks: UserDeck[]
  myCards: UserCard[]
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
    exercises: {},
    playgroundCode: null,
    cards: {},
    decks: [],
    myCards: [],
  }
}

function load(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return empty()
    const parsed = JSON.parse(raw) as { version?: number }
    // Version 1 had no exercises and version 2 no flashcards; the defaults from empty() fill them in.
    if (typeof parsed.version !== 'number' || parsed.version < 1 || parsed.version > VERSION) return empty()
    return { ...empty(), ...parsed, version: VERSION } as Progress
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

const noExercise: ExerciseStat = { attempts: 0, solvedAt: null, code: null }

export function recordExerciseCheck(exerciseId: string, passed: boolean, at: number = Date.now()) {
  const prev = state.exercises[exerciseId] ?? noExercise
  const solvedAt = prev.solvedAt ?? (passed ? at : null)
  commit({ ...state, exercises: { ...state.exercises, [exerciseId]: { ...prev, attempts: prev.attempts + 1, solvedAt } } })
}

/** Keeps the learner's draft; null forgets it (the editor then shows the starter code). */
export function setExerciseCode(exerciseId: string, code: string | null) {
  const prev = state.exercises[exerciseId] ?? noExercise
  commit({ ...state, exercises: { ...state.exercises, [exerciseId]: { ...prev, code } } })
}

export function setPlaygroundCode(code: string | null) {
  commit({ ...state, playgroundCode: code })
}

export function recordCardReview(cardId: string, stat: CardStat) {
  commit({ ...state, cards: { ...state.cards, [cardId]: stat } })
}

const newId = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`

/** Creates an empty deck of own cards and returns its id. */
export function createDeck(name: string, at: number = Date.now()): string {
  const id = newId('d')
  commit({ ...state, decks: [...state.decks, { id, name, createdAt: at }] })
  return id
}

export function renameDeck(deckId: string, name: string) {
  commit({ ...state, decks: state.decks.map((d) => (d.id === deckId ? { ...d, name } : d)) })
}

/** Deletes a deck with its cards and their review state. */
export function deleteDeck(deckId: string) {
  const gone = new Set(state.myCards.filter((c) => c.deckId === deckId).map((c) => c.id))
  commit({
    ...state,
    decks: state.decks.filter((d) => d.id !== deckId),
    myCards: state.myCards.filter((c) => !gone.has(c.id)),
    cards: Object.fromEntries(Object.entries(state.cards).filter(([id]) => !gone.has(id))),
  })
}

export type CardDraft = Pick<UserCard, 'deckId' | 'front' | 'back' | 'code'>

/** Adds own cards (e.g. one typed in, or a whole uploaded deck) and returns their ids. */
export function addCards(drafts: CardDraft[], at: number = Date.now()): string[] {
  const added = drafts.map((d): UserCard => ({ ...d, id: newId('u'), createdAt: at, updatedAt: at }))
  commit({ ...state, myCards: [...state.myCards, ...added] })
  return added.map((c) => c.id)
}

/** Changes an own card's text. Its review state is kept. */
export function updateCard(cardId: string, change: Pick<UserCard, 'front' | 'back' | 'code'>, at: number = Date.now()) {
  commit({ ...state, myCards: state.myCards.map((c) => (c.id === cardId ? { ...c, ...change, updatedAt: at } : c)) })
}

export function deleteCard(cardId: string) {
  const { [cardId]: _, ...cards } = state.cards
  commit({ ...state, myCards: state.myCards.filter((c) => c.id !== cardId), cards })
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
  exercises: z.record(z.string(), z.object({ attempts: count, solvedAt: z.number().nullable(), code: z.string().nullable() })),
  playgroundCode: z.string().nullable(),
  cards: z.record(z.string(), z.object({ box: z.number().int().min(0).max(5), due: z.number(), reviews: count, lapses: count, lastAt: z.number() })),
  decks: z.array(z.object({ id: z.string(), name: z.string(), createdAt: z.number() })),
  myCards: z.array(
    z.object({
      id: z.string(),
      deckId: z.string(),
      front: z.string(),
      back: z.string(),
      code: z.string().nullable(),
      createdAt: z.number(),
      updatedAt: z.number(),
    }),
  ),
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
  // Older versions lack newer fields; the defaults from empty() fill them in.
  const older = typeof version === 'number' && version >= 1 && version < VERSION
  const result = ProgressSchema.safeParse({ ...empty(), ...doc.progress, ...(older ? { version: VERSION } : {}) })
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
