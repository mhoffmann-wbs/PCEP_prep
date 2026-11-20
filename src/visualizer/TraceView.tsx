import { useState } from 'react'
import { Inline } from '../components/Inline'
import type { Trace } from '../python/runtime'
import { useShortcuts } from '../quiz/shortcuts'
import { STEP_LIMIT, changedVars, describeStep, outputUpTo, previousLine, varKey } from './trace'

const button = 'rounded border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40'

/**
 * Steps through a recorded run: the code with the next line marked, the
 * variables of every active call, and the output so far.
 */
export function TraceView({ code, trace }: { code: string; trace: Trace }) {
  const [index, setIndex] = useState(0)
  const last = trace.steps.length - 1
  const go = (next: number) => setIndex(Math.max(0, Math.min(last, next)))
  useShortcuts({ ArrowRight: () => go(index + 1), ArrowLeft: () => go(index - 1), Home: () => go(0), End: () => go(last) })

  const step = trace.steps[index]!
  const changed = changedVars(trace, index)
  const ranLine = previousLine(trace, index)
  const output = outputUpTo(trace, index)
  const lines = code.replace(/\n$/, '').split('\n')
  const marker = step.event === 'exception' || step.event === 'error' ? 'bg-red-500/25' : 'bg-accent/25'

  return (
    <section aria-label="Step through" className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={button} onClick={() => go(0)} disabled={index === 0}>
          First
        </button>
        <button type="button" className={button} onClick={() => go(index - 1)} disabled={index === 0}>
          ← Back
        </button>
        <button type="button" className={`${button} border-brand bg-brand text-chalk`} onClick={() => go(index + 1)} disabled={index === last}>
          Next →
        </button>
        <button type="button" className={button} onClick={() => go(last)} disabled={index === last}>
          Last
        </button>
        <label className="flex min-w-40 flex-1 items-center gap-2 text-sm text-slate-600">
          <span className="sr-only">Step</span>
          <input type="range" min={0} max={last} value={index} onChange={(e) => go(Number(e.target.value))} className="w-full accent-brand" />
        </label>
        <span className="text-sm text-slate-600">
          Step {index + 1} of {last + 1}
        </span>
      </div>
      <p aria-live="polite" className="font-medium">
        <Inline text={describeStep(step)} />
      </p>
      {trace.truncated && index === last && (
        <p className="rounded border border-amber-300 bg-amber-50 p-3 text-sm">
          Stopped after {STEP_LIMIT} steps. The program may contain an endless loop, or it is too long to step through.
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h2 className="text-sm font-medium text-slate-700">Code</h2>
          <ol aria-label="Code" className="mt-1 overflow-x-auto rounded-lg bg-code py-3 font-mono text-sm leading-relaxed text-[#e6edf3]">
            {lines.map((text, i) => {
              const n = i + 1
              const current = n === step.line
              return (
                <li key={n} aria-current={current ? 'step' : undefined} className={`flex whitespace-pre pr-3 ${current ? marker : ''}`}>
                  <span aria-hidden className="w-6 shrink-0 text-center text-accent">
                    {current ? '➜' : n === ranLine ? '·' : ''}
                  </span>
                  <span aria-hidden className="w-7 shrink-0 pr-2 text-right text-[#64748b]">
                    {n}
                  </span>
                  <span>{text || ' '}</span>
                </li>
              )
            })}
          </ol>
          <p className="mt-1 text-xs text-slate-500">➜ the line that runs next · a dot marks the line that just ran</p>
        </div>
        <div className="space-y-3">
          {step.frames.map((frame, depth) => (
            <section key={depth} aria-label={frame.name === 'Global' ? 'Global variables' : `Call to ${frame.name}`} className="rounded border border-slate-200 bg-white">
              <h2 className="border-b border-slate-200 px-3 py-1.5 text-sm font-semibold">
                {frame.name === 'Global' ? 'Global variables' : `${frame.name}()`}
              </h2>
              {frame.vars.length === 0 ? (
                <p className="px-3 py-2 text-sm text-slate-500">No variables yet</p>
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {frame.vars.map((v) => {
                      const isNew = changed.has(varKey(depth, frame.name, v.name))
                      return (
                        <tr key={v.name} className={isNew ? 'bg-accent/20' : ''}>
                          <th scope="row" className="w-1/3 px-3 py-1 text-left font-mono font-normal">
                            {v.name}
                          </th>
                          <td className="px-3 py-1 font-mono break-all">
                            {v.value}
                            {v.ref !== null && (
                              <span className="ml-2 rounded bg-slate-200 px-1 text-xs text-slate-700" title="Names with the same number share one object">
                                #{v.ref}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-1 text-right text-xs text-slate-500">{v.type}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </section>
          ))}
          <p className="text-xs text-slate-500">
            Highlighted rows changed in this step. Lists, dicts and sets carry a number: two names with the same number refer to the same
            object, so changing it through one name changes it for both.
          </p>
          <section aria-label="Output so far">
            <h2 className="text-sm font-medium text-slate-700">Output so far</h2>
            <pre className="mt-1 min-h-12 whitespace-pre-wrap rounded bg-code p-3 font-mono text-sm text-[#e6edf3]">{output}</pre>
          </section>
        </div>
      </div>
    </section>
  )
}
