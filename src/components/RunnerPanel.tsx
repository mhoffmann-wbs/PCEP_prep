import { useState } from 'react'
import { Link } from 'react-router'
import { explainError } from '../python/explain'
import { usePythonRunner } from '../python/usePythonRunner'

const STATUS_TEXT = { idle: '', loading: 'Loading Python…', ready: '', running: 'Running…' }

interface Props {
  initialCode?: string
  initialStdin?: string
  files?: Record<string, string>
}

/** Code box, input box, Run button and output with error explanations. */
export function RunnerPanel({ initialCode = '', initialStdin = '', files }: Props) {
  const [code, setCode] = useState(initialCode)
  const [stdin, setStdin] = useState(initialStdin)
  const { status, output, outcome, loadError, run } = usePythonRunner()
  const busy = status === 'loading' || status === 'running'
  const start = () => !busy && run({ code, stdin, files })
  const error = outcome?.error
  const explanation = error && explainError(error)
  const written = Object.entries(outcome?.files ?? {}).filter(([name, text]) => files?.[name] !== text)

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Code</span>
        <textarea
          className="mt-1 block h-56 w-full rounded border border-slate-300 p-2 font-mono text-sm"
          value={code}
          spellCheck={false}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault()
              start()
            } else if (e.key === 'Tab') {
              e.preventDefault()
              const el = e.currentTarget
              const { selectionStart: s, selectionEnd: end } = el
              setCode(code.slice(0, s) + '    ' + code.slice(end))
              requestAnimationFrame(() => el.setSelectionRange(s + 4, s + 4))
            }
          }}
        />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Input (one line per input() call)</span>
        <textarea
          className="mt-1 block h-16 w-full rounded border border-slate-300 p-2 font-mono text-sm"
          value={stdin}
          spellCheck={false}
          onChange={(e) => setStdin(e.target.value)}
        />
      </label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={start}
          disabled={busy}
          className="rounded bg-blue-700 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          Run
        </button>
        <span className="text-sm text-slate-500">{STATUS_TEXT[status] || 'Ctrl+Enter to run'}</span>
      </div>
      {loadError && <p className="text-red-700">{loadError}</p>}
      <section aria-label="Output">
        <h2 className="text-sm font-medium text-slate-700">Output</h2>
        <pre className="mt-1 min-h-16 whitespace-pre-wrap rounded bg-slate-900 p-3 font-mono text-sm text-slate-100">
          {output}
          {error && <span className="text-red-300">{error.traceback || `${error.type}: ${error.message}`}</span>}
        </pre>
      </section>
      {explanation && (
        <aside className="rounded border border-amber-300 bg-amber-50 p-3">
          <h2 className="font-semibold">
            {explanation.title}
            {error.line && <span className="font-normal text-slate-600"> (line {error.line})</span>}
          </h2>
          <p className="mt-1">{explanation.text}</p>
          <Link className="mt-1 inline-block text-sm text-blue-700 underline" to={`/learn/${explanation.lessonId}`}>
            Lesson {explanation.lessonId}
          </Link>
        </aside>
      )}
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
