// Pure helpers for the step-through visualizer: what a step means in words,
// which variables changed since the previous step, and the output so far.
import type { Trace, TraceStep } from '../python/runtime'

export const STEP_LIMIT = 1000

/** One sentence for the step, with `backtick` spans for code. */
export function describeStep(step: TraceStep): string {
  switch (step.event) {
    case 'line':
      return `Line ${step.line} runs next.`
    case 'return': {
      const fn = step.frames.at(-1)?.name ?? 'The function'
      return `\`${fn}()\` returns \`${step.detail}\`.`
    }
    case 'exception':
      return `Line ${step.line} raised \`${step.detail}\`.`
    case 'end':
      return 'The program finished.'
    case 'error':
      return `The program stopped with \`${step.detail}\`.`
  }
}

const key = (depth: number, frame: string, name: string) => `${depth}:${frame}:${name}`

function values(step: TraceStep): Map<string, string> {
  const map = new Map<string, string>()
  step.frames.forEach((f, depth) => {
    for (const v of f.vars) map.set(key(depth, f.name, v.name), `${v.ref ?? ''}|${v.value}`)
  })
  return map
}

/**
 * Keys (`depth:frame:name`) of variables that are new or hold a different value
 * than in the previous step. Nothing is marked on the first step.
 */
export function changedVars(trace: Trace, index: number): Set<string> {
  if (index === 0) return new Set()
  const before = values(trace.steps[index - 1]!)
  const changed = new Set<string>()
  for (const [k, v] of values(trace.steps[index]!)) if (before.get(k) !== v) changed.add(k)
  return changed
}

export const varKey = key

/** Everything printed up to and including the step. */
export function outputUpTo(trace: Trace, index: number): string {
  return trace.steps
    .slice(0, index + 1)
    .map((s) => s.out)
    .join('')
}

/** The line that ran just before the step (shown as "just ran"), if any. */
export function previousLine(trace: Trace, index: number): number | null {
  for (let i = index - 1; i >= 0; i--) {
    const { line, event } = trace.steps[i]!
    if (event === 'line' && line !== null) return line
  }
  return null
}
