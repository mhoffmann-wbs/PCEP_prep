// Interactive input(): the worker blocks on shared memory until the page sends
// the line the learner typed. Needs SharedArrayBuffer, so the page must be
// cross-origin isolated (see public/coi-sw.js); without it, input() reads only
// the lines given in advance.
//
// Layout: Int32 state (0 = waiting, 1 = answered), Int32 length (-1 = end of
// input), then the line as UTF-8.
const HEADER_BYTES = 8
const LINE_BYTES = 16 * 1024

export const createInputBuffer = () => new SharedArrayBuffer(HEADER_BYTES + LINE_BYTES)

/** Whether this page can share memory with the worker. */
export const canShareMemory = () => typeof SharedArrayBuffer !== 'undefined' && globalThis.crossOriginIsolated === true

/**
 * Worker side: marks the buffer as waiting, calls `ask` (which tells the page),
 * then blocks until the page answers. Returns the line, or null at end of input.
 */
export function waitForLine(buffer: SharedArrayBuffer, ask: () => void): string | null {
  const header = new Int32Array(buffer, 0, 2)
  Atomics.store(header, 0, 0)
  ask()
  Atomics.wait(header, 0, 0)
  const length = Atomics.load(header, 1)
  if (length < 0) return null
  // TextDecoder can't read shared memory directly, so copy the bytes out first.
  return new TextDecoder().decode(new Uint8Array(buffer, HEADER_BYTES, length).slice())
}

/** Page side: answers a waiting worker with a line, or null for end of input. */
export function sendLine(buffer: SharedArrayBuffer, line: string | null) {
  const header = new Int32Array(buffer, 0, 2)
  let length = -1
  if (line !== null) {
    const bytes = new TextEncoder().encode(line)
    // Cut overlong lines at a character boundary.
    let end = Math.min(bytes.length, LINE_BYTES)
    while (end < bytes.length && end > 0 && (bytes[end]! & 0xc0) === 0x80) end--
    new Uint8Array(buffer, HEADER_BYTES, end).set(bytes.subarray(0, end))
    length = end
  }
  Atomics.store(header, 1, length)
  Atomics.store(header, 0, 1)
  Atomics.notify(header, 0)
}
