import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { CodeBlock, Inline } from '../components/Inline'
import { ErrorHelp, RunnerPanel } from '../components/RunnerPanel'
import { EXAM_PROFILES, OBJECTIVES, OBJECTIVE_BY_ID } from '../content/blueprint'
import { EXERCISES, EXERCISE_BY_ID } from '../content/exercises'
import type { Exercise } from '../content/schema'
import { type CheckReport, checkExercise } from '../exercises/check'
import { pythonRunner } from '../python/client'
import { recordExerciseCheck, setExerciseCode, useProgress } from '../progress/store'

export default function ExercisesPage() {
  const { exerciseId } = useParams()
  if (!exerciseId) return <ExerciseIndex />
  const exercise = EXERCISE_BY_ID.get(exerciseId)
  if (!exercise) {
    return (
      <p>
        No such exercise.{' '}
        <Link to="/exercises" className="underline">
          Back to Exercises
        </Link>
      </p>
    )
  }
  return <ExerciseView key={exerciseId} exercise={exercise} />
}

/** Exercises in syllabus order (extras last), then file order within an objective. */
const objectiveIndex = new Map(OBJECTIVES.map((o, i) => [o.id, i]))
const ORDERED = [...EXERCISES].sort((a, b) => objectiveIndex.get(a.objectiveId)! - objectiveIndex.get(b.objectiveId)! || a.id.localeCompare(b.id))

const SECTIONS = [
  ...EXAM_PROFILES['30-03'].sections.map((s) => ({ id: s.id, title: `${s.id}. ${s.title}` })),
  { id: 'x', title: 'PCEP-30-02 extras' },
]

const KIND_LABEL = { function: 'Write a function', io: 'Write a program' }

function ExamBadge({ objectiveId }: { objectiveId: string }) {
  const exams = OBJECTIVE_BY_ID.get(objectiveId)!.exams
  if (!exams) return null
  return <span className="ml-2 rounded bg-accent px-1.5 py-0.5 text-xs text-slate-900">{exams[0]} only</span>
}

function ExerciseIndex() {
  const { exercises } = useProgress()
  const solved = ORDERED.filter((e) => exercises[e.id]?.solvedAt).length
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Exercises</h1>
      <p className="text-slate-600">
        Small programs to write yourself, checked by running them in your browser. Each one comes with hints, revealed one at a time, and a
        model solution. {solved} of {ORDERED.length} solved.
      </p>
      {SECTIONS.map((s) => {
        const list = ORDERED.filter((e) => OBJECTIVE_BY_ID.get(e.objectiveId)!.sectionId === s.id)
        if (list.length === 0) return null
        return (
          <section key={s.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="font-semibold">{s.title}</h2>
            <ul className="mt-2 space-y-1">
              {list.map((e) => (
                <li key={e.id} className="flex items-baseline gap-2 text-sm">
                  <span className="w-4 shrink-0" aria-label={exercises[e.id]?.solvedAt ? 'solved' : undefined}>
                    {exercises[e.id]?.solvedAt ? '✓' : ''}
                  </span>
                  <span className="w-12 shrink-0 text-slate-500">{e.objectiveId}</span>
                  <Link to={`/exercises/${e.id}`} className="text-brand-dark hover:underline">
                    {e.title}
                  </Link>
                  <span className="text-xs text-slate-500">{KIND_LABEL[e.kind]}</span>
                  {s.id !== 'x' && <ExamBadge objectiveId={e.objectiveId} />}
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

/**
 * Prompt text: paragraphs split by blank lines; paragraphs of "1. " or "- " lines
 * become lists, and a paragraph fenced with ``` is shown as a block (an example
 * run or output; it may not contain blank lines).
 */
function Prompt({ text }: { text: string }) {
  return (
    <div className="space-y-3">
      {text.split(/\n\s*\n/).map((para, i) => {
        const lines = para.split('\n')
        if (para.startsWith('```'))
          return (
            <pre key={i} className="rounded border border-slate-300 bg-slate-50 p-3 font-mono text-sm">
              {lines.slice(1, lines.at(-1) === '```' ? -1 : undefined).join('\n')}
            </pre>
          )
        if (lines.every((l) => /^\d+\. /.test(l)))
          return (
            <ol key={i} className="list-decimal space-y-1 pl-6">
              {lines.map((l, j) => (
                <li key={j}>
                  <Inline text={l.replace(/^\d+\. /, '')} />
                </li>
              ))}
            </ol>
          )
        if (lines.every((l) => l.startsWith('- ')))
          return (
            <ul key={i} className="list-disc space-y-1 pl-6">
              {lines.map((l, j) => (
                <li key={j}>
                  <Inline text={l.slice(2)} />
                </li>
              ))}
            </ul>
          )
        return (
          <p key={i}>
            <Inline text={para} />
          </p>
        )
      })}
    </div>
  )
}

function ExerciseView({ exercise: ex }: { exercise: Exercise }) {
  const { exercises } = useProgress()
  const stat = exercises[ex.id]
  const objective = OBJECTIVE_BY_ID.get(ex.objectiveId)!
  // Bumped by "Reset to starter" to remount the editor with the starter code.
  const [resets, setResets] = useState(0)
  const [checking, setChecking] = useState(false)
  const [report, setReport] = useState<CheckReport | null>(null)
  const [hintsShown, setHintsShown] = useState(0)
  const [solutionShown, setSolutionShown] = useState(false)
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const check = async (code: string) => {
    setChecking(true)
    setReport(null)
    try {
      const result = await checkExercise(ex, code, (req) => pythonRunner.run(req))
      recordExerciseCheck(ex.id, result.passed)
      setReport(result)
    } finally {
      setChecking(false)
    }
  }
  const index = ORDERED.indexOf(ex)
  const prev = ORDERED[index - 1]
  const next = ORDERED[index + 1]

  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm text-slate-500">
          <Link to="/exercises" className="hover:underline">
            Exercises
          </Link>{' '}
          /{' '}
          <Link to={`/learn/${objective.id}`} className="hover:underline">
            {objective.id} <Inline text={objective.title} />
          </Link>
        </p>
        <h1 className="text-3xl font-bold">
          {ex.title}
          <ExamBadge objectiveId={ex.objectiveId} />
        </h1>
        <p className="text-sm text-slate-600">
          {KIND_LABEL[ex.kind]}
          {stat?.solvedAt ? ' · ✓ Solved' : ''}
        </p>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <Prompt text={ex.prompt} />
        {ex.files && (
          <p className="mt-3 text-sm text-slate-600">
            Files available to <code className="font-mono">open()</code>: {Object.keys(ex.files).join(', ')}
          </p>
        )}
        {ex.kind === 'io' && ex.cases.some((c) => c.stdin) && (
          <p className="mt-3 text-sm text-slate-600">
            Check runs your program once for each test input. Any prompt text you give <code className="font-mono">input()</code> is left out
            when your output is compared, so word it as you like.
          </p>
        )}
      </section>

      <RunnerPanel
        key={resets}
        initialCode={resets === 0 ? (stat?.code ?? ex.starter) : ex.starter}
        initialStdin={ex.kind === 'io' ? ex.cases[0]!.stdin : ''}
        files={ex.files}
        onCodeChange={(code) => setExerciseCode(ex.id, code)}
        renderActions={(code) => (
          <>
            <button
              type="button"
              onClick={() => check(code)}
              disabled={checking}
              className="rounded bg-accent px-4 py-2 font-medium text-slate-900 disabled:opacity-50"
            >
              {checking ? 'Checking…' : 'Check'}
            </button>
            <button
              type="button"
              onClick={() => {
                setExerciseCode(ex.id, null)
                setResets((n) => n + 1)
                setReport(null)
              }}
              className="rounded border border-slate-300 px-3 py-2 text-sm"
            >
              Reset to starter
            </button>
          </>
        )}
      />

      {report && <Report report={report} next={next} />}

      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-semibold">Stuck?</h2>
        {ex.hints.slice(0, hintsShown).map((hint, i) => (
          <p key={i} className="rounded bg-slate-50 p-3 text-sm">
            <strong>Hint {i + 1}:</strong> <Inline text={hint} />
          </p>
        ))}
        <div className="flex flex-wrap gap-3">
          {hintsShown < ex.hints.length && (
            <button type="button" onClick={() => setHintsShown((n) => n + 1)} className="rounded border border-brand px-3 py-1.5 text-sm text-brand-dark">
              Show hint {hintsShown + 1} of {ex.hints.length}
            </button>
          )}
          {!solutionShown && (
            <button type="button" onClick={() => setSolutionShown(true)} className="rounded border border-slate-300 px-3 py-1.5 text-sm">
              {stat?.attempts ? 'Show the solution' : 'Show the solution (try first!)'}
            </button>
          )}
        </div>
        {solutionShown && (
          <div className="space-y-1">
            <p className="text-sm text-slate-600">One way to solve it (yours can differ and still pass):</p>
            <CodeBlock code={ex.solution.trimEnd()} />
          </div>
        )}
      </section>

      <nav aria-label="Exercise navigation" className="flex gap-3 border-t border-slate-200 pt-6">
        {prev && <NavCard ex={prev} label="← Previous exercise" align="" />}
        {next && <NavCard ex={next} label="Next exercise →" align="ml-auto text-right" />}
      </nav>
    </article>
  )
}

function NavCard({ ex, label, align }: { ex: Exercise; label: string; align: string }) {
  return (
    <Link to={`/exercises/${ex.id}`} className={`flex-1 rounded-lg border border-slate-200 bg-white p-4 hover:border-brand ${align}`}>
      <span className="block text-xs text-slate-500">{label}</span>
      <span className="font-medium text-brand-dark">
        {ex.objectiveId} {ex.title}
      </span>
    </Link>
  )
}

function Report({ report, next }: { report: CheckReport; next?: Exercise }) {
  return (
    <section aria-label="Check results" className={`space-y-3 rounded-lg border-2 p-4 ${report.passed ? 'border-green-600 bg-green-50' : 'border-red-600 bg-white'}`}>
      <h2 className="font-semibold">
        {report.passed
          ? '✓ All checks passed. Well done!'
          : report.rows.length === 0
            ? 'Your program stopped with an error before the checks could run.'
            : `${report.rows.filter((r) => r.passed).length} of ${report.rows.length} checks passed.`}
      </h2>
      {report.rows.length > 0 && (
        <ul className="space-y-2">
          {report.rows.map((row, i) => (
            <li key={i} className="text-sm">
              <span className={row.passed ? 'text-green-600' : 'text-red-700'}>{row.passed ? '✓' : '✗'}</span>{' '}
              <code className="font-mono">{row.label}</code>
              {row.details.map((d, j) => (
                <pre key={j} className="mt-1 whitespace-pre-wrap rounded bg-slate-100 p-2 font-mono text-xs">
                  {d}
                </pre>
              ))}
            </li>
          ))}
        </ul>
      )}
      {report.error && report.rows.length === 0 && (
        <>
          <pre className="whitespace-pre-wrap rounded bg-code p-3 font-mono text-sm text-[#ff9b9b]">
            {report.error.traceback || `${report.error.type}: ${report.error.message}`}
          </pre>
          <ErrorHelp error={report.error} />
        </>
      )}
      {report.passed && next && (
        <Link to={`/exercises/${next.id}`} className="inline-block rounded bg-brand px-4 py-2 font-medium text-chalk">
          Next exercise →
        </Link>
      )}
    </section>
  )
}
