
export type Rng = () => number

/** Deterministic PRNG (mulberry32) so tests can pin a seed. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffle<T>(xs: readonly T[], rand: Rng = Math.random): T[] {
  const out = [...xs]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

/** A shuffled line order for an ordering item that is not already an accepted answer. */
export function scrambledOrder(n: number, accepted: number[][], rand: Rng = Math.random): number[] {
  const identity = Array.from({ length: n }, (_, i) => i)
  const ok = (o: number[]) => !accepted.some((a) => a.join(',') === o.join(','))
  for (let tries = 0; tries < 20; tries++) {
    const o = shuffle(identity, rand)
    if (ok(o)) return o
  }
  return [...identity].reverse()
}
