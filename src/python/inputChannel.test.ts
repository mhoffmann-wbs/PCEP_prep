import { describe, expect, it } from 'vitest'
import { createInputBuffer, sendLine, waitForLine } from './inputChannel'

// The page answers before the worker waits here, so Atomics.wait returns at once.
const roundTrip = (line: string | null) => {
  const buffer = createInputBuffer()
  return waitForLine(buffer, () => sendLine(buffer, line))
}

describe('input channel', () => {
  it('carries a line, including non-ASCII text, and null for end of input', () => {
    expect(roundTrip('Zoë 🐍')).toBe('Zoë 🐍')
    expect(roundTrip('')).toBe('')
    expect(roundTrip(null)).toBeNull()
  })

  it('cuts an overlong line without splitting a character', () => {
    const line = roundTrip('é'.repeat(10_000))!
    expect(line.length).toBe(8192)
    expect(line).toBe('é'.repeat(8192))
  })
})
