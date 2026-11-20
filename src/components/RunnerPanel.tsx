import { type ReactNode, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { CodeEditor } from './CodeEditor'
import { explainError } from '../python/explain'
import type { PyError } from '../python/runtime'
import { usePythonRunner } from '../python/usePythonRunner'

const STATUS_TEXT = { idle: '', loading: 'Loading Python…', ready: '', running: 'Running…' }

interface Props {
  initialCode?: string
  initialStdin?: string
  files?: Record<string, string>
  /** Run once as soon as the panel appears. */
  autoRun?: boolean
  onCodeChange?: (code: string) => void
  minLines?: number
  /** Show the box for input() lines. */
  showStdin?: boolean
  /** Extra buttons next to Run, e.g. an exercise's Check. */
  renderActions?: (code: string) => ReactNode
}

/** Code box, input box, Run button and output with error explanations. */
export function RunnerPanel({ initialCode = '', initialStdin = '', files, autoRun = false, onCodeChange, minLines = 10, showStdin = true, renderActions }: Props) {
  const [code, setCode] = useState(initialCode)
  const [stdin, setStdin] = useState(initialStdin)
  const { status, output, outcome, loadError, run } = usePythonRunner()
  const busy = status === 'loading' || status === 'running'
  const start = () => !busy && run({ code, stdin, files })
  const edit = (next: string) => {
    setCode(next)
    onCodeChange?.(next)
  }
  // Run once on mount. The ref survives React's dev-mode double effect call.
  const autoRan = useRef(false)
  useEffect(() => {
    if (autoRun && !autoRan.current) {
      autoRan.current = true
      start()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const error = outcome?.error
  const written = Object.entries(outcome?.files ?? {}).filter(([name, text]) => files?.[name] !== text)

  return (
    <div className="space-y-4">
      <div>
        <span className="text-sm font-medium text-slate-700">Code</span>
        <div className="mt-1">
          <CodeEditor value={code} onChange={edit} onRun={start} label="Code" minLines={minLines} />
        </div>
      </div>
      {showStdin && (
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Input (one line per input() call)</span>
          <textarea
            className="mt-1 block h-16 w-full rounded border border-slate-300 bg-white p-2 font-mono text-sm"
            value={stdin}
            spellCheck={false}
            onChange={(e) => setStdin(e.target.value)}
          />
        </label>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={start}
          disabled={busy}
          className="rounded bg-brand px-4 py-2 font-medium text-chalk disabled:opacity-50"
        >
          Run
        </button>
        {renderActions?.(code)}
        <span className="text-sm text-slate-500">{STATUS_TEXT[status] || 'Ctrl+Enter to run'}</span>
      </div>
      {loadError && <p className="text-red-700">{loadError}</p>}
      <section aria-label="Output">
        <h2 className="text-sm font-medium text-slate-700">Output</h2>
        <pre className="mt-1 min-h-16 whitespace-pre-wrap rounded bg-code p-3 font-mono text-sm text-[#e6edf3]">
          {output}
          {error && <span className="text-[#ff9b9b]">{error.traceback || `${error.type}: ${error.message}`}</span>}
        </pre>
      </section>
      {error && <ErrorHelp error={error} />}
      {written.length > 0 && (
        <section aria-label="Files">
          <h2 className="text-sm font-medium text-slate-700">Files written by the program</h2>
          {written.map(([name, text]) => (
            <div key={name} className="mt-2">
              <div className="font-mono text-xs text-slate-500">{name}</div>
              <pre className="rounded bg-slate-100 p-2 font-mono text-sm">{text ?? '(binary file)'}</pre>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}

/** A beginner explanation of a Python error, with a link to the lesson that covers it. */
export function ErrorHelp({ error }: { error: PyError }) {
  const explanation = explainError(error)
  if (!explanation) return null
  return (
    <aside className="rounded border border-amber-300 bg-amber-50 p-3">
      <h2 className="font-semibold">
        {explanation.title}
        {error.line && <span className="font-normal text-slate-600"> (line {error.line})</span>}
      </h2>
      <p className="mt-1">{explanation.text}</p>
      <Link className="mt-1 inline-block text-sm text-brand-dark underline" to={`/learn/${explanation.lessonId}`}>
        Lesson {explanation.lessonId}
      </Link>
    </aside>
  )
}
