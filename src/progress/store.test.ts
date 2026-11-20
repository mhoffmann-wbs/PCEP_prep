// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { exportProgress, getProgress, importProgress, recordAnswer, reloadProgress, resetProgress, setExtras, setTrack } from './store'
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
    expect(() => importProgress(JSON.stringify({ app: 'pcep101', progress: { version: 2 } }))).toThrow('newer version')
    expect(getProgress().items['4.1.2-01']?.attempts).toBe(1)
  })

  it('derives mastery levels', () => {
    expect(masteryOf(undefined)).toBe('untested')
    expect(masteryOf({ attempts: 2, correct: 1, lastCorrect: false, lastAt: 0, streak: 0 })).toBe('recentError')
    expect(masteryOf({ attempts: 2, correct: 1, lastCorrect: true, lastAt: 0, streak: 1 })).toBe('reviewed')
    expect(masteryOf({ attempts: 2, correct: 2, lastCorrect: true, lastAt: 0, streak: 2 })).toBe('alwaysCorrect')
  })
})
