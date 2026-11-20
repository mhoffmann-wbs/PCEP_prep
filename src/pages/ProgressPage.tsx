import { type ChangeEvent, useState } from 'react'
import { Link } from 'react-router'
import { ExamSettings } from '../components/ExamSettings'
import { Inline } from '../components/Inline'
import { EXAM_PROFILES, OBJECTIVE_BY_ID } from '../content/blueprint'
import { ITEMS } from '../content/bank'
import { EXERCISES } from '../content/exercises'
import { objectiveReadiness, weightedReadiness } from '../progress/readiness'
import { exportProgress, importProgress, useProgress } from '../progress/store'
import { objectiveWeights, practiceObjectives, practicePool } from '../quiz/pools'

const pct = (n: number) => `${Math.round(n * 100)}%`

export default function ProgressPage() {
  const progress = useProgress()
  const profile = EXAM_PROFILES[progress.track]
  const objectives = practiceObjectives(progress)
  const pool = practicePool(ITEMS, progress)
  const weights = objectiveWeights(progress)
  const rows = objectiveReadiness(objectives, pool, progress)
  const byId = new Map(rows.map((r) => [r.objectiveId, r]))
  const sections = profile.sections.map((s) => {
    const sectionRows = s.objectiveIds.flatMap((id) => byId.get(id) ?? [])
    return { ...s, readiness: weightedReadiness(sectionRows, weights) }
  })
  const weakest = rows.filter((r) => pool.some((i) => i.objectiveId === r.objectiveId)).sort((a, b) => a.readiness - b.readiness).slice(0, 5)
  const lastMock = progress.mockResults.at(-1)

  return (
    <div className="space-y-8">
      <section className="space-y-2">
        <h1 className="text-3xl font-bold">Progress</h1>
        <p className="text-slate-600">
          Readiness is the share of each objective's questions you can currently answer, weighted by the {profile.name} syllabus. It's a
          study guide, not a score prediction.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Weighted readiness" value={pct(weightedReadiness(rows, weights))} />
        <Stat label="Last mock (estimate)" value={lastMock ? `${lastMock.percent}%` : '–'} hint={`pass at ${profile.passPercent}%`} />
        <Stat label="Questions answered" value={String(Object.keys(progress.items).length)} hint={`of ${pool.length}`} />
        <Stat label="Mocks taken" value={String(progress.mockResults.length)} />
        <Stat
          label="Exercises solved"
          value={String(EXERCISES.filter((e) => progress.exercises[e.id]?.solvedAt).length)}
          hint={`of ${EXERCISES.length}`}
        />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-semibold">By {progress.track === '30-03' ? 'section' : 'block'}</h2>
        <ul className="mt-3 space-y-2">
          {sections.map((s) => (
            <li key={s.id}>
              <div className="flex justify-between text-sm">
                <span>
                  {s.id}. {s.title}
                </span>
                <span className="font-mono">{pct(s.readiness)}</span>
              </div>
              <div className="mt-1 h-2 rounded bg-slate-100" role="presentation">
                <div className="h-2 rounded bg-brand" style={{ width: pct(s.readiness) }} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Weakest objectives</h2>
          <Link to="/practice?weak=1" className="rounded bg-brand-dark px-4 py-2 text-sm font-medium text-chalk">
            Run the weak-spot drill
          </Link>
        </div>
        {weakest.length === 0 && <p className="mt-3 text-sm text-slate-500">No questions yet.</p>}
        <ul className="mt-3 space-y-1 text-sm">
          {weakest.map((r) => (
            <li key={r.objectiveId} className="flex justify-between gap-4">
              <Link to={`/learn/${r.objectiveId}`} className="text-brand-dark hover:underline">
                {r.objectiveId} <Inline text={OBJECTIVE_BY_ID.get(r.objectiveId)!.title} />
              </Link>
              <span className="shrink-0 text-slate-500">
                {pct(r.coverage)} seen · {pct(r.accuracy)} right
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-semibold">Exam settings</h2>
        <ExamSettings parts={['track', 'practice', 'mock']} />
      </section>

      <YourData />
    </div>
  )
}

/** Progress lives in this browser only, so learners can move it between devices as a file. */
function YourData() {
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  function download() {
    const url = URL.createObjectURL(new Blob([exportProgress()], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `pcep101-progress-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // let the same file be picked again
    if (!file) return
    if (!window.confirm('Importing replaces all progress in this browser. Continue?')) return
    try {
      importProgress(await file.text())
      setMessage({ ok: true, text: `Imported progress from ${file.name}.` })
    } catch (err) {
      setMessage({ ok: false, text: (err as Error).message })
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="font-semibold">Your data</h2>
      <p className="mt-1 text-sm text-slate-600">
        Progress is saved in this browser only. Export it to keep a backup or to continue on another device, then import the file there.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button onClick={download} className="rounded border px-4 py-2 text-sm">
          Export progress
        </button>
        <label className="cursor-pointer rounded border px-4 py-2 text-sm">
          Import progress
          <input type="file" accept="application/json,.json" onChange={upload} className="sr-only" />
        </label>
      </div>
      {message && (
        <p role="status" className={`mt-2 text-sm ${message.ok ? 'text-green-600' : 'text-red-600'}`}>
          {message.text}
        </p>
      )}
    </section>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  )
}
