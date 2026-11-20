import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { ExamSettings } from '../components/ExamSettings'
import { Inline } from '../components/Inline'
import { OBJECTIVE_BY_ID } from '../content/blueprint'
import { ITEMS } from '../content/bank'
import type { Item } from '../content/schema'
import { MASTERY_LEVELS, type Mastery, masteryOf } from '../progress/readiness'
import { type Progress, recordAnswer, useProgress } from '../progress/store'
import { freshResponse } from '../quiz/answer'
import { grade, isAnswered } from '../quiz/grade'
import { ItemRun } from '../quiz/ItemRun'
import { ItemView } from '../quiz/ItemView'
import { practiceObjectives, practicePool } from '../quiz/pools'
import { ShortcutHint } from '../quiz/ShortcutHint'
import { useShortcuts } from '../quiz/shortcuts'

export default function QuestionsPage() {
  const { itemId } = useParams()
  // Keying on the id resets the answer state when moving to another item.
  return itemId ? <ItemDetail key={itemId} itemId={itemId} /> : <ItemIndex />
}

const KIND_LABELS: Record<Item['kind'], string> = {
  single: 'Single choice',
  multi: 'Multiple choice',
  gap: 'Fill the gaps',
  order: 'Put in order',
  insert: 'Insert the line',
}

/** Items matching the topic filter (`?objective=` or `?section=`), in bank order. */
function topicPool(params: URLSearchParams, progress: Progress): Item[] {
  const objectiveId = params.get('objective')
  const sectionId = params.get('section')
  const pool = practicePool(ITEMS, progress)
  if (objectiveId) return pool.filter((i) => i.objectiveId === objectiveId)
  if (sectionId) return pool.filter((i) => OBJECTIVE_BY_ID.get(i.objectiveId)?.sectionId === sectionId)
  return pool
}

function filtered(params: URLSearchParams, progress: Progress): Item[] {
  const mastery = params.get('mastery')
  const pool = topicPool(params, progress)
  return mastery ? pool.filter((i) => masteryOf(progress.items[i.id]) === mastery) : pool
}

function MasteryBadge({ mastery }: { mastery: Mastery }) {
  const level = MASTERY_LEVELS.find((l) => l.id === mastery)!
  return <span className={`shrink-0 rounded border px-1.5 py-0.5 text-xs ${level.tone}`}>{level.label}</span>
}

function ItemIndex() {
  const progress = useProgress()
  const [params, setParams] = useSearchParams()
  const pool = topicPool(params, progress)
  const shown = filtered(params, progress)
  const mastery = params.get('mastery')
  const objectives = practiceObjectives(progress)
  const sections = [...new Set(objectives.map((o) => o.sectionId))]
  const topic = params.get('objective') ? `objective=${params.get('objective')}` : params.get('section') ? `section=${params.get('section')}` : ''
  const all = practicePool(ITEMS, progress)

  function update(key: string, value: string | null) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  function setTopic(value: string) {
    const next = new URLSearchParams(params)
    next.delete('objective')
    next.delete('section')
    if (value) {
      const [key, id] = value.split('=') as [string, string]
      next.set(key, id)
    }
    setParams(next, { replace: true })
  }

  const search = params.toString()
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Question bank</h1>
      <p className="text-slate-600">
        Every question with your mastery of it. Open one to answer it on its own; the answer counts toward your progress like any practice
        question.
      </p>

      <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <label className="flex flex-wrap items-center gap-2 text-sm">
          Topic
          <select value={topic} onChange={(e) => setTopic(e.target.value)} className="max-w-full rounded border border-slate-300 bg-white px-2 py-1">
            <option value="">All topics ({all.length})</option>
            {sections.map((sid) => (
              <optgroup key={sid} label={sid === 'x' ? 'PCEP-30-02 extras' : `Section ${sid}`}>
                <option value={`section=${sid}`}>All of {sid === 'x' ? 'the extras' : `section ${sid}`}</option>
                {objectives
                  .filter((o) => o.sectionId === sid)
                  .map((o) => (
                    <option key={o.id} value={`objective=${o.id}`}>
                      {o.id} {o.title.replaceAll('`', '')}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
        <ExamSettings parts={['practice']} />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Mastery filter">
          {MASTERY_LEVELS.map((level) => {
            const count = pool.filter((i) => masteryOf(progress.items[i.id]) === level.id).length
            const active = mastery === level.id
            return (
              <button
                key={level.id}
                type="button"
                aria-pressed={active}
                onClick={() => update('mastery', active ? null : level.id)}
                className={`rounded border px-2 py-1 text-sm ${level.tone} ${active ? 'ring-2 ring-brand' : ''}`}
              >
                {level.label} ({count})
              </button>
            )
          })}
        </div>
      </div>

      {shown.length === 0 && <p className="text-slate-500">No questions match this filter.</p>}
      {objectives.map((o) => {
        const items = shown.filter((i) => i.objectiveId === o.id)
        if (items.length === 0) return null
        return (
          <section key={o.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="font-semibold">
              {o.id} <Inline text={o.title} />
            </h2>
            <ul className="mt-2 divide-y divide-slate-100">
              {items.map((i) => (
                <li key={i.id}>
                  <Link to={`/questions/${i.id}${search ? `?${search}` : ''}`} className="flex items-start justify-between gap-3 py-2 text-sm hover:text-brand-dark">
                    <span className="line-clamp-2">
                      <span className="text-slate-500">{KIND_LABELS[i.kind]} · </span>
                      <Inline text={i.stem} />
                    </span>
                    <MasteryBadge mastery={masteryOf(progress.items[i.id])} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function ItemDetail({ itemId }: { itemId: string }) {
  const progress = useProgress()
  const [params] = useSearchParams()
  const item = ITEMS.find((i) => i.id === itemId)
  const [response, setResponse] = useState(() => (item ? freshResponse(item) : null))
  const [revealed, setRevealed] = useState(false)
  const navigate = useNavigate()
  const search = params.toString() ? `?${params}` : ''

  // Prev/next walk the filtered list. Answering can move this item out of a
  // mastery filter, so it stays in the list for navigation.
  const list = filtered(params, progress)
  const nav = item && !list.some((i) => i.id === item.id) ? ITEMS.filter((i) => i.id === item.id || list.includes(i)) : list
  const index = item ? nav.findIndex((i) => i.id === item.id) : -1
  const prev = index > 0 ? nav[index - 1] : undefined
  const next = index >= 0 ? nav[index + 1] : undefined

  // Declared before the early return below, so the handlers guard against a missing item.
  useShortcuts({
    Enter: () => {
      if (item && response && !revealed && isAnswered(item, response)) check()
    },
    ArrowLeft: () => prev && navigate(`/questions/${prev.id}${search}`),
    ArrowRight: () => next && navigate(`/questions/${next.id}${search}`),
  })

  if (!item || !response) {
    return (
      <p>
        No such question.{' '}
        <Link to="/questions" className="underline">
          Back to the question bank
        </Link>
      </p>
    )
  }

  function check() {
    recordAnswer(item!.id, grade(item!, response!))
    setRevealed(true)
  }

  const correct = revealed && grade(item, response)
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 text-sm text-slate-600">
        <Link to={`/questions${search}`} className="hover:underline">
          ← Question bank
        </Link>
        <span className="flex items-center gap-2">
          {index + 1} of {nav.length} · <MasteryBadge mastery={masteryOf(progress.items[item.id])} />
        </span>
      </div>
      <ItemView item={item} response={response} onChange={setResponse} revealed={revealed} keyboard />
      {revealed && (
        <p role="status" className={`text-lg font-semibold ${correct ? 'text-green-600' : 'text-red-600'}`}>
          {correct ? '✓ Correct' : '✗ Not quite'}
        </p>
      )}
      {revealed && <ItemRun item={item} />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-3 text-sm">
          {prev && (
            <Link to={`/questions/${prev.id}${search}`} className="rounded border px-3 py-2">
              ← Previous
            </Link>
          )}
          {next && (
            <Link to={`/questions/${next.id}${search}`} className="rounded border px-3 py-2">
              Next →
            </Link>
          )}
        </div>
        {!revealed && (
          <button onClick={check} disabled={!isAnswered(item, response)} className="rounded bg-brand px-4 py-2 font-medium text-chalk disabled:opacity-40">
            Check answer
          </button>
        )}
      </div>
      <ShortcutHint items={[['1–6', 'or A–F select'], ['Enter', 'check'], ['← →', 'previous / next']]} />
      <p className="text-xs text-slate-500">
        Lesson:{' '}
        <Link to={`/learn/${item.objectiveId}`} className="underline">
          {item.objectiveId} <Inline text={OBJECTIVE_BY_ID.get(item.objectiveId)!.title} />
        </Link>
      </p>
    </div>
  )
}
