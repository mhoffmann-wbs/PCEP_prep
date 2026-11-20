import { describe, expect, it } from 'vitest'
import { decodeCode, encodeCode } from './playgroundLink'

describe('playground permalinks', () => {
  it('round-trips code with non-ASCII text and URL-unsafe characters', () => {
    const code = 'print("Grüße, café ☕")\nx = 3 >> 1 // 2 + 1 ?? \n'
    const hash = encodeCode(code)
    expect(hash).toMatch(/^#code=[A-Za-z0-9_-]+$/)
    expect(decodeCode(hash)).toBe(code)
  })

  it('ignores other hashes and damaged links', () => {
    expect(decodeCode('')).toBeNull()
    expect(decodeCode('#top')).toBeNull()
    expect(decodeCode('#code=%%%')).toBeNull()
    expect(decodeCode('#code=_w')).toBeNull()
  })
})
