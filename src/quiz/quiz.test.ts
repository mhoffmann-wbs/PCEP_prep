import { describe, expect, it } from 'vitest'
import { EXAM_PROFILES } from '../content/blueprint'
import { ITEMS } from '../content/bank'
import type { Item } from '../content/schema'
import { GAP, INSERT, MULTI, ORDER, SINGLE } from '../test/fixtures'
import { freshResponse } from './answer'
import { grade, isAnswered, normaliseAnswer } from './grade'
import { objectiveWeights, practiceObjectives, practicePool } from './pools'
import { seededRng } from './random'
import { scoreMock } from './results'
import { buildFocusSet, buildMixedSet, buildMockExam, orderLeastMastered } from './sampler'

/** A fake bank item for objective `objectiveId`. */
const fake = (objectiveId: string, n: number, subpoint = `${objectiveId}.1`): Item => ({
  ...SINGLE,
  id: `${objectiveId}-${String(n).padStart(2, '0')}`,
  objectiveId,
  subpoints: [subpoint],
})

describe('grading', () => {
  it('grades single and insert items by the chosen option', () => {
    expect(grade(SINGLE, { kind: 'single', choice: 0 })).toBe(true)
    expect(grade(SINGLE, { kind: 'single', choice: 1 })).toBe(false)
    expect(grade(SINGLE, { kind: 'single', choice: null })).toBe(false)
    expect(grade(INSERT, { kind: 'insert', choice: 0 })).toBe(true)
  })

  it('grades multi items all or nothing', () => {
    expect(grade(MULTI, { kind: 'multi', choices: [1, 0] })).toBe(true)
    expect(grade(MULTI, { kind: 'multi', choices: [0] })).toBe(false)
    expect(grade(MULTI, { kind: 'multi', choices: [0, 2] })).toBe(false)
    expect(isAnswered(MULTI, { kind: 'multi', choices: [0] })).toBe(false)
  })

  it('grades gaps with whitespace-normalised text and exact choices', () => {
    expect(normaliseAnswer('  [ : ] ')).toBe('[:]')
    expect(normaliseAnswer('return  x + 1')).toBe('return x+1')
    expect(grade(GAP, { kind: 'gap', values: { 1: 'items' } })).toBe(true)
    expect(grade(GAP, { kind: 'gap', values: { 1: 'keys' } })).toBe(false)
    const text = { ...GAP, blanks: [{ n: 1, kind: 'text' as const, accept: ['items'], rationale: 'r' }] }
    expect(grade(text, { kind: 'gap', values: { 1: ' items ' } })).toBe(true)
    expect(isAnswered(text, { kind: 'gap', values: { 1: '  ' } })).toBe(false)
  })

  it('accepts the main order and listed alternative orders', () => {
    expect(grade(ORDER, { kind: 'order', order: [0, 1, 2, 3] })).toBe(true)
    expect(grade(ORDER, { kind: 'order', order: [1, 0, 2, 3] })).toBe(true)
    expect(grade(ORDER, { kind: 'order', order: [0, 1, 3, 2] })).toBe(false)
  })

  it('starts ordering items scrambled, never in an accepted order', () => {
    for (let i = 0; i < 50; i++) expect(grade(ORDER, freshResponse(ORDER))).toBe(false)
  })
})

describe('pools', () => {
  it('follow the track and the extras toggle', () => {
    const ids = (p: Parameters<typeof practiceObjectives>[0]) => practiceObjectives(p).map((o) => o.id)
    expect(ids({ track: '30-03', extrasInPractice: false })).toHaveLength(35)
    expect(ids({ track: '30-03', extrasInPractice: true })).toHaveLength(41)
    expect(ids({ track: '30-02', extrasInPractice: true })).not.toContain('3.3.1')
    expect(ids({ track: '30-02', extrasInPractice: false })).not.toContain('x.1')
  })

  it('drop items that test 30-03-only sub-points on the 30-02 track', () => {
    const bank = [fake('2.2.1', 1, '2.2.1.5'), fake('2.2.1', 2, '2.2.1.1'), fake('x.3', 1, 'x.3.1')]
    expect(practicePool(bank, { track: '30-02', extrasInPractice: true }).map((i) => i.id)).toEqual(['2.2.1-02', 'x.3-01'])
    expect(practicePool(bank, { track: '30-03', extrasInPractice: false }).map((i) => i.id)).toEqual(['2.2.1-01', '2.2.1-02'])
  })

  it('weights objectives by their section weight', () => {
    const w = objectiveWeights({ track: '30-03' })
    expect(w.get('3.1.1')).toBeCloseTo(26 / 9)
    expect(w.get('5.2.3')).toBeCloseTo(14 / 5)
    expect([...EXAM_PROFILES['30-03'].sections.flatMap((s) => s.objectiveIds)].reduce((a, id) => a + w.get(id)!, 0)).toBeCloseTo(100)
  })
})

describe('mock exam', () => {
  const allObjectives = EXAM_PROFILES['30-03'].sections.flatMap((s) => s.objectiveIds)
  const fullBank = [...allObjectives, 'x.1', 'x.2', 'x.3', 'x.4', 'x.5', 'x.6'].flatMap((id) => [fake(id, 1), fake(id, 2)])

  it('draws one item per objective for 30-03', () => {
    const mock = buildMockExam(fullBank, '30-03', false, new Set(), seededRng(1))
    expect(mock).toMatchObject({ minutes: 50, shortfall: 0, extended: false })
    expect(new Set(mock.items.map((i) => i.objectiveId))).toEqual(new Set(allObjectives))
  })

  it('adds one item per extra objective when extended, at the real pace', () => {
    const mock = buildMockExam(fullBank, '30-03', true, new Set(), seededRng(2))
    expect(mock.items).toHaveLength(41)
    expect(mock.minutes).toBe(59)
  })

  it('draws each 30-02 block its syllabus count, without 30-03-only topics', () => {
    const mock = buildMockExam(fullBank, '30-02', true, new Set(), seededRng(3))
    expect(mock.items).toHaveLength(30)
    expect(mock.minutes).toBe(40)
    expect(mock.items.some((i) => ['3.3.1', '4.1.4', '5.1.1'].includes(i.objectiveId))).toBe(false)
    for (const block of EXAM_PROFILES['30-02'].sections)
      expect(mock.items.filter((i) => block.objectiveIds.includes(i.objectiveId))).toHaveLength(block.items)
  })

  it('prefers items not seen before', () => {
    const seen = new Set(fullBank.filter((i) => i.id.endsWith('-01')).map((i) => i.id))
    const mock = buildMockExam(fullBank, '30-03', false, seen, seededRng(4))
    expect(mock.items.every((i) => i.id.endsWith('-02'))).toBe(true)
  })

  it('scales the time when the bank is short', () => {
    const short = fullBank.filter((i) => !i.objectiveId.startsWith('5.'))
    const mock = buildMockExam(short, '30-03', false, new Set(), seededRng(5))
    expect(mock).toMatchObject({ shortfall: 5, minutes: Math.round((50 * 30) / 35) })
    expect(mock.items).toHaveLength(30)
  })

  it('fills a full 30-03 mock from the real bank', () => {
    expect(buildMockExam(ITEMS, '30-03', false, new Set(), seededRng(6))).toMatchObject({ shortfall: 0, minutes: 50 })
    expect(buildMockExam(ITEMS, '30-02', true, new Set(), seededRng(6))).toMatchObject({ shortfall: 0, minutes: 40 })
  })

  it('scores by section and keeps the extras apart', () => {
    const items = [fake('1.1.1', 1), fake('1.2.1', 1), fake('3.3.1', 1), fake('x.1', 1)]
    const score = scoreMock('30-03', items, (i) => i.objectiveId !== '1.2.1')
    expect(score).toMatchObject({ correct: 2, total: 3, percent: 67, passed: false })
    expect(score.sections.find((s) => s.id === '1')).toMatchObject({ correct: 1, total: 2 })
    expect(score.extras).toMatchObject({ correct: 1, total: 1 })
    expect(scoreMock('30-03', items.slice(0, 1), () => true).passed).toBe(true)
  })
})

describe('practice sets', () => {
  const bank = ['1.1.1', '3.1.1', '5.2.3'].flatMap((id) => [1, 2, 3, 4].map((n) => fake(id, n)))
  const weights = objectiveWeights({ track: '30-03' })

  it('draws mixed sets of the requested size without repeats', () => {
    const set = buildMixedSet(bank, weights, 6, seededRng(7))
    expect(set).toHaveLength(6)
    expect(new Set(set.map((i) => i.id)).size).toBe(6)
  })

  it('orders least mastered first and keeps focus sets to the lowest streaks', () => {
    const streak = (id: string) => (id.endsWith('-01') ? 0 : 3)
    expect(orderLeastMastered(bank, streak, seededRng(8)).slice(0, 3).every((i) => i.id.endsWith('-01'))).toBe(true)
    const focus = buildFocusSet(bank, weights, 3, streak, seededRng(9))
    expect(focus).toHaveLength(3)
  })
})
