import { useEffect } from 'react'
import { Link, useParams } from 'react-router'
import { Inline } from '../components/Inline'
import { EXAM_PROFILES, OBJECTIVES, OBJECTIVE_BY_ID, PE1_URL } from '../content/blueprint'
import { ITEMS } from '../content/bank'
import { LESSONS } from '../content/lessons'
import { lessonComponents } from '../lessons/components'
import { setLessonRead, useProgress } from '../progress/store'

export default function LearnPage() {
  const { objectiveId } = useParams()
  return objectiveId ? <LessonView key={objectiveId} objectiveId={objectiveId} /> : <LessonIndex />
}

/** Sections in syllabus order, then the 30-02 extras. Lessons are always reachable, whatever the track. */
const SECTIONS = [
  ...EXAM_PROFILES['30-03'].sections.map((s) => ({ id: s.id, title: s.title, objectiveIds: s.objectiveIds })),
  { id: 'x', title: 'PCEP-30-02 extras', objectiveIds: OBJECTIVES.filter((o) => o.sectionId === 'x').map((o) => o.id) },
]
const ORDER = SECTIONS.flatMap((s) => s.objectiveIds)

function ExamBadge({ objectiveId }: { objectiveId: string }) {
  const o = OBJECTIVE_BY_ID.get(objectiveId)!
  if (!o.exams) return null
  return <span className="ml-2 rounded bg-accent px-1.5 py-0.5 text-xs text-slate-900">{o.exams[0]} only</span>
}

function LessonIndex() {
  const { lessonsRead } = useProgress()
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Learn</h1>
      <p className="text-slate-600">
        One lesson per syllabus objective: the big idea, worked examples you can run, quick predict-the-output checks, common mistakes and
        exam traps. {lessonsRead.length} of {LESSONS.size} marked as read. Free extra course:{' '}
        <a href={PE1_URL} className="text-brand-dark underline">
          Python Essentials 1
        </a>
        .
      </p>
      {SECTIONS.map((s) => (
        <section key={s.id} className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="font-semibold">
            {s.id === 'x' ? '' : `${s.id}. `}
            {s.title}
          </h2>
          <ul className="mt-2 space-y-1">
            {s.objectiveIds.map((id) => (
              <li key={id} className="flex items-baseline gap-2 text-sm">
                <span className="w-4 shrink-0">{lessonsRead.includes(id) ? '✓' : ''}</span>
                {LESSONS.has(id) ? (
                  <Link to={`/learn/${id}`} className="text-brand-dark hover:underline">
                    {id} <Inline text={OBJECTIVE_BY_ID.get(id)!.title} />
                  </Link>
                ) : (
                  <span className="text-slate-400">
                    {id} <Inline text={OBJECTIVE_BY_ID.get(id)!.title} /> (coming soon)
                  </span>
                )}
                {s.id !== 'x' && <ExamBadge objectiveId={id} />}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function LessonView({ objectiveId }: { objectiveId: string }) {
  const { lessonsRead } = useProgress()
  const objective = OBJECTIVE_BY_ID.get(objectiveId)
  const lesson = LESSONS.get(objectiveId)
  // The topic links sit at the bottom of the page, so start each lesson at the top
  // (the view is keyed by objective, so this runs once per lesson).
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])
  if (!objective) {
    return (
      <p>
        No such objective.{' '}
        <Link to="/learn" className="underline">
          Back to Learn
        </Link>
      </p>
    )
  }
  const section = SECTIONS.find((s) => s.objectiveIds.includes(objectiveId))!
  const read = lessonsRead.includes(objectiveId)
  const practiceCount = ITEMS.filter((i) => i.objectiveId === objectiveId).length

  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm text-slate-500">
          <Link to="/learn" className="hover:underline">
            Learn
          </Link>{' '}
          / {section.title}
        </p>
        <h1 className="text-3xl font-bold">
          {objective.id} <Inline text={objective.title} />
          <ExamBadge objectiveId={objectiveId} />
        </h1>
        {lesson && <p className="text-sm text-slate-600">Checked against the syllabus on {lesson.meta.updated}</p>}
      </header>

      {lesson ? (
        <>
          <p className="rounded-lg border-l-4 border-brand bg-white p-4">
            <strong>In short:</strong> <Inline text={lesson.meta.tldr} />
          </p>
          <div className="prose max-w-none prose-a:text-brand-dark prose-code:before:content-none prose-code:after:content-none">
            <lesson.Content components={lessonComponents} />
          </div>
        </>
      ) : (
        <p className="rounded border border-amber-300 bg-amber-50 p-3 text-sm">The lesson for this objective is coming soon.</p>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="font-semibold">What the syllabus covers</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
            {objective.subpoints.map((s) => (
              <li key={s.id}>
                <Inline text={s.text} />
                {s.exams && <span className="ml-1 text-xs text-slate-500">(PCEP-{s.exams.join(', ')} only)</span>}
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="font-semibold">Read more</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {lesson?.meta.links.map((link) => (
              <li key={link.url}>
                <a href={link.url} target="_blank" rel="noreferrer" className="text-brand-dark underline">
                  {link.title}
                </a>
              </li>
            ))}
            <li>
              <a href={PE1_URL} target="_blank" rel="noreferrer" className="text-brand-dark underline">
                Python Essentials 1
              </a>{' '}
              <span className="text-slate-500">(free course)</span>
            </li>
          </ul>
        </div>
      </section>

      <footer className="flex flex-wrap items-center gap-3">
        {lesson && (
          <button
            onClick={() => setLessonRead(objectiveId, !read)}
            className={`rounded px-4 py-2 font-medium ${read ? 'border border-brand text-brand-dark' : 'bg-brand text-chalk'}`}
          >
            {read ? '✓ Marked as read' : 'Mark as read'}
          </button>
        )}
        {practiceCount > 0 && (
          <Link to={`/practice?objective=${objectiveId}`} className="rounded border px-4 py-2">
            Practise this objective ({practiceCount})
          </Link>
        )}
        {practiceCount > 0 && (
          <Link to={`/questions?objective=${objectiveId}`} className="rounded border px-4 py-2">
            Browse its questions
          </Link>
        )}
      </footer>

      <LessonNav objectiveId={objectiveId} />
    </article>
  )
}

/** Previous and next lesson in syllabus order, skipping objectives without a lesson yet. */
function LessonNav({ objectiveId }: { objectiveId: string }) {
  const order = ORDER.filter((id) => LESSONS.has(id) || id === objectiveId)
  const index = order.indexOf(objectiveId)
  const prev = order[index - 1]
  const next = order[index + 1]
  const card = (id: string, label: string, align: string) => (
    <Link to={`/learn/${id}`} className={`flex-1 rounded-lg border border-slate-200 bg-white p-4 hover:border-brand ${align}`}>
      <span className="block text-xs text-slate-500">{label}</span>
      <span className="font-medium text-brand-dark">
        {id} <Inline text={OBJECTIVE_BY_ID.get(id)!.title} />
      </span>
    </Link>
  )
  return (
    <nav aria-label="Lesson navigation" className="flex gap-3 border-t border-slate-200 pt-6">
      {prev && card(prev, '← Previous topic', '')}
      {next && card(next, 'Next topic →', 'ml-auto text-right')}
    </nav>
  )
}
