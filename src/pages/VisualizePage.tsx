import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import { CodeEditor } from '../components/CodeEditor'
import { ErrorHelp, InputLine, StdinBox } from '../components/RunnerPanel'
import { usePythonRunner } from '../python/usePythonRunner'
import { TraceView } from '../visualizer/TraceView'
import { decodeCode } from './playgroundLink'

const SAMPLE = `def add_bonus(scores, bonus):
    for i in range(len(scores)):
        scores[i] += bonus
    return len(scores)

team = [7, 5, 9]
copy = team[:]
alias = team
count = add_bonus(alias, 2)
print(team, copy, count)
`

/** What other pages pass in the navigation state ("Step through"). */
export type StepThroughState = { code?: string; files?: Record<string, string>; stdin?: string } | null

export default function VisualizePage() {
  const location = useLocation()
  const from = location.state as StepThroughState
  const initial = from?.code ?? decodeCode(location.hash) ?? SAMPLE
  const files = from?.code ? from.files : undefined
  const [code, setCode] = useState(initial)
  const [stdin, setStdin] = useState(from?.stdin ?? '')
  // The code the current trace belongs to; editing the code hides a stale trace.
  const [traced, setTraced] = useState<string | null>(null)
  const { status, output, outcome, loadError, run, waiting, sendInput, interactive } = usePythonRunner()
  const busy = status === 'loading' || status === 'running'
  const start = () => {
    if (busy) return
    setTraced(code)
    run({ code, stdin, files, trace: true })
  }
  // Code handed over by another page is stepped through straight away.
  const autoRan = useRef(false)
  useEffect(() => {
    if (from?.code && !autoRan.current) {
      autoRan.current = true
      start()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const trace = traced === code ? outcome?.trace : null
  const failed = traced === code && outcome && !outcome.trace ? outcome.error : null
  const finalError = trace && outcome?.error

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Step through</h1>
      <p className="text-slate-700">
        Watch a program run one line at a time: which line runs next, what every variable holds, and what has been printed so far. Use
        Next and Back, or the ← and → keys.
      </p>
      {files && Object.keys(files).length > 0 && (
        <p className="text-sm text-slate-600">
          Files available to <code className="font-mono">open()</code>: {Object.keys(files).join(', ')}
        </p>
      )}
      <CodeEditor value={code} onChange={setCode} onRun={start} label="Code" minLines={6} />
      <StdinBox value={stdin} onChange={setStdin} interactive={interactive} />
      <div className="flex items-center gap-3">
        <button type="button" onClick={start} disabled={busy} className="rounded bg-brand px-4 py-2 font-medium text-chalk disabled:opacity-50">
          Step through
        </button>
        <span className="text-sm text-slate-500">{status === 'loading' ? 'Loading Python…' : status === 'running' ? 'Running…' : ''}</span>
      </div>
      {loadError && <p className="text-red-700">{loadError}</p>}
      {waiting && (
        <section aria-label="Program output">
          <pre className="min-h-12 whitespace-pre-wrap rounded bg-code p-3 font-mono text-sm text-[#e6edf3]">{output}</pre>
          <InputLine onSend={sendInput} />
        </section>
      )}
      {failed && <p className="text-red-700">{failed.message}</p>}
      {traced !== null && traced !== code && <p className="text-sm text-slate-600">The code changed. Press Step through to trace it again.</p>}
      {trace && <TraceView code={code} trace={trace} />}
      {finalError && <ErrorHelp error={finalError} />}
    </section>
  )
}
