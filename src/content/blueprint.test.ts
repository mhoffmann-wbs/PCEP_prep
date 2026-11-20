import { describe, expect, it } from 'vitest'
import {
  CORE_OBJECTIVES,
  EXAM_PROFILES,
  EXTRA_OBJECTIVES,
  GROUPS,
  OBJECTIVE_BY_ID,
  OBJECTIVES,
  mockShape,
  objectiveInExam,
  subpointInExam,
} from './blueprint'

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

describe('blueprint', () => {
  it('has 35 core objectives and 6 extras with unique ids', () => {
    expect(CORE_OBJECTIVES).toHaveLength(35)
    expect(EXTRA_OBJECTIVES.map((o) => o.id)).toEqual(['x.1', 'x.2', 'x.3', 'x.4', 'x.5', 'x.6'])
    expect(OBJECTIVE_BY_ID.size).toBe(OBJECTIVES.length)
  })

  it('numbers objectives and sub-points consistently', () => {
    for (const o of CORE_OBJECTIVES) expect(o.id.startsWith(`${o.groupId}.`)).toBe(true)
    for (const o of OBJECTIVES) {
      expect(GROUPS[o.groupId]).toBeTruthy()
      expect(o.subpoints.length).toBeGreaterThanOrEqual(3)
      o.subpoints.forEach((s, i) => expect(s.id).toBe(`${o.id}.${i + 1}`))
      // Code in titles and sub-points is wrapped in backticks, in pairs.
      for (const text of [o.title, ...o.subpoints.map((s) => s.text)]) expect(text.split('`').length % 2).toBe(1)
    }
  })

  it('tags the extras 30-02 only, with a 30-02 source', () => {
    for (const o of EXTRA_OBJECTIVES) {
      expect(o.exams).toEqual(['30-02'])
      expect(o.source).toMatch(/^PCEP-30-02 /)
    }
  })

  it('tags exactly the 30-03-only topics', () => {
    const only303 = CORE_OBJECTIVES.filter((o) => !objectiveInExam(o, '30-02')).map((o) => o.id)
    expect(only303).toEqual(['3.3.1', '3.5.3', '4.1.4', '5.1.1', '5.1.2', '5.2.1', '5.2.2', '5.2.3'])
    const taggedSubpoints = CORE_OBJECTIVES.flatMap((o) => o.subpoints.filter((s) => s.exams).map((s) => s.id))
    expect(taggedSubpoints).toEqual(['2.2.1.5'])
    expect(subpointInExam('2.2.1.5', '30-02')).toBe(false)
    expect(subpointInExam('2.2.1.4', '30-02')).toBe(true)
    expect(subpointInExam('3.3.1.1', '30-02')).toBe(false)
    expect(subpointInExam('x.3.1', '30-03')).toBe(false)
    expect(subpointInExam('9.9.9.9', '30-03')).toBe(false)
  })

  describe.each(Object.values(EXAM_PROFILES))('$name profile', (profile) => {
    it('has weights summing to 100 and item counts summing to the exam length', () => {
      expect(sum(profile.sections.map((s) => s.weight))).toBe(100)
      expect(sum(profile.sections.map((s) => s.items))).toBe(profile.items)
    })

    it('maps every objective of the exam to exactly one section', () => {
      const mapped = profile.sections.flatMap((s) => s.objectiveIds)
      expect(new Set(mapped).size).toBe(mapped.length)
      const expected = OBJECTIVES.filter((o) => objectiveInExam(o, profile.id)).map((o) => o.id)
      expect([...mapped].sort()).toEqual([...expected].sort())
    })
  })

  it('gives each 30-03 section one item per objective', () => {
    for (const s of EXAM_PROFILES['30-03'].sections) expect(s.items).toBe(s.objectiveIds.length)
  })

  it('places the extras in the right 30-02 blocks', () => {
    const extrasIn = (id: string) => EXAM_PROFILES['30-02'].sections.find((s) => s.id === id)!.objectiveIds.filter((o) => o.startsWith('x.'))
    expect(extrasIn('1')).toEqual(['x.1', 'x.2'])
    expect(extrasIn('2')).toEqual(['x.3'])
    expect(extrasIn('3')).toEqual(['x.4'])
    expect(extrasIn('4')).toEqual(['x.5', 'x.6'])
  })

  it('scales the extended 30-03 mock at the real pace', () => {
    expect(mockShape('30-03', false)).toEqual({ items: 35, minutes: 50 })
    expect(mockShape('30-03', true)).toEqual({ items: 41, minutes: 59 })
    expect(mockShape('30-02', true)).toEqual({ items: 30, minutes: 40 })
  })
})
