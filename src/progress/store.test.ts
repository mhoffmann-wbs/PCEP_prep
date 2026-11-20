// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  addCards,
  createDeck,
  deleteCard,
  deleteDeck,
  exportProgress,
  getProgress,
  importProgress,
  recordAnswer,
  recordCardReview,
  renameDeck,
  updateCard,
  recordExerciseCheck,
  reloadProgress,
  resetProgress,
  setExerciseCode,
  setExtras,
  setTrack,
} from './store'
import { masteryOf } from './readiness'

beforeEach(() => {
  localStorage.clear()
  resetProgress()
})

describe('progress store', () => {
  it('records attempts with a streak that a wrong answer resets', () => {
    recordAnswer('2.2.3-01', true, 1)
    recordAnswer('2.2.3-01', true, 2)
    expect(getProgress().items['2.2.3-01']).toMatchObject({ attempts: 2, correct: 2, streak: 2 })
    recordAnswer('2.2.3-01', false, 3)
    expect(getProgress().items['2.2.3-01']).toMatchObject({ attempts: 3, correct: 2, streak: 0, lastCorrect: false })
  })

  it('persists to localStorage and survives a reload', () => {
    recordAnswer('3.1.1-01', true)
    reloadProgress()
    expect(getProgress().items['3.1.1-01']?.attempts).toBe(1)
  })

  it('discards unreadable or other-version data', () => {
    localStorage.setItem('pcep101:progress', '{not json')
    reloadProgress()
    expect(getProgress().items).toEqual({})
    localStorage.setItem('pcep101:progress', JSON.stringify({ version: 99, items: { a: 1 } }))
    reloadProgress()
    expect(getProgress().items).toEqual({})
  })

  it('migrates version 1 data, which had no exercises', () => {
    const v1 = { version: 1, track: '30-02', extrasInPractice: true, extrasInMock: true, items: {}, mockResults: [], lessonsRead: ['2.2.3'], playgroundCode: null }
    localStorage.setItem('pcep101:progress', JSON.stringify(v1))
    reloadProgress()
    expect(getProgress()).toMatchObject({ version: 3, track: '30-02', lessonsRead: ['2.2.3'], exercises: {}, cards: {}, decks: [], myCards: [] })
    importProgress(JSON.stringify({ app: 'pcep101', progress: v1 }))
    expect(getProgress()).toMatchObject({ version: 3, exercises: {}, cards: {} })
  })

  it('migrates version 2 data, which had no flashcards', () => {
    const v2 = { ...JSON.parse(exportProgress()).progress, version: 2, lessonsRead: ['1.1.1'] }
    for (const key of ['cards', 'decks', 'myCards']) delete v2[key]
    localStorage.setItem('pcep101:progress', JSON.stringify(v2))
    reloadProgress()
    expect(getProgress()).toMatchObject({ version: 3, lessonsRead: ['1.1.1'], cards: {}, decks: [], myCards: [] })
    importProgress(JSON.stringify({ app: 'pcep101', progress: v2 }))
    expect(getProgress()).toMatchObject({ version: 3, myCards: [] })
  })

  it('keeps own decks and cards; deleting a deck removes its cards and their review state', () => {
    const deck = createDeck('Loops', 1)
    const other = createDeck('Strings', 1)
    const [a, b] = addCards([
      { deckId: deck, front: 'Q1', back: 'A1', code: null },
      { deckId: other, front: 'Q2', back: 'A2', code: 'print(1)' },
    ])
    recordCardReview(a!, { box: 1, due: 5, reviews: 1, lapses: 0, lastAt: 1 })
    recordCardReview(b!, { box: 2, due: 5, reviews: 2, lapses: 0, lastAt: 1 })
    updateCard(b!, { front: 'Q2?', back: 'A2', code: null }, 9)
    renameDeck(other, 'Text')
    reloadProgress()
    expect(getProgress().myCards.find((c) => c.id === b)).toMatchObject({ front: 'Q2?', code: null, updatedAt: 9 })
    expect(getProgress().decks.map((d) => d.name)).toEqual(['Loops', 'Text'])
    deleteDeck(deck)
    expect(getProgress().myCards.map((c) => c.id)).toEqual([b])
    expect(Object.keys(getProgress().cards)).toEqual([b])
    deleteCard(b!)
    expect(getProgress()).toMatchObject({ myCards: [], cards: {} })
  })

  it('records exercise checks and drafts; a solved exercise stays solved', () => {
    setExerciseCode('3.1.1-e1', 'def ends(q):')
    recordExerciseCheck('3.1.1-e1', false, 1)
    recordExerciseCheck('3.1.1-e1', true, 2)
    recordExerciseCheck('3.1.1-e1', false, 3)
    expect(getProgress().exercises['3.1.1-e1']).toEqual({ attempts: 3, solvedAt: 2, code: 'def ends(q):' })
    reloadProgress()
    expect(getProgress().exercises['3.1.1-e1']?.solvedAt).toBe(2)
  })

  it('resets the extras toggles to the track defaults when the track changes', () => {
    expect(getProgress()).toMatchObject({ track: '30-03', extrasInPractice: false, extrasInMock: false })
    setTrack('30-02')
    expect(getProgress()).toMatchObject({ track: '30-02', extrasInPractice: true, extrasInMock: true })
    setExtras('extrasInPractice', false)
    setTrack('30-03')
    expect(getProgress()).toMatchObject({ extrasInPractice: false, extrasInMock: false })
  })

  it('round-trips an export and rejects bad files without changing anything', () => {
    recordAnswer('4.1.2-01', true)
    const file = exportProgress()
    resetProgress()
    importProgress(file)
    expect(getProgress().items['4.1.2-01']?.attempts).toBe(1)
    expect(() => importProgress('nope')).toThrow("isn't valid JSON")
    expect(() => importProgress('{"app":"other"}')).toThrow("isn't a PCEP101 progress export")
    expect(() => importProgress(JSON.stringify({ app: 'pcep101', progress: { version: 1, items: { x: { attempts: -1 } } } }))).toThrow('damaged')
    expect(() => importProgress(JSON.stringify({ app: 'pcep101', progress: { version: 4 } }))).toThrow('newer version')
    expect(getProgress().items['4.1.2-01']?.attempts).toBe(1)
  })

  it('derives mastery levels', () => {
    expect(masteryOf(undefined)).toBe('untested')
    expect(masteryOf({ attempts: 2, correct: 1, lastCorrect: false, lastAt: 0, streak: 0 })).toBe('recentError')
    expect(masteryOf({ attempts: 2, correct: 1, lastCorrect: true, lastAt: 0, streak: 1 })).toBe('reviewed')
    expect(masteryOf({ attempts: 2, correct: 2, lastCorrect: true, lastAt: 0, streak: 2 })).toBe('alwaysCorrect')
  })
})
