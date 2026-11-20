import { Link, useParams } from 'react-router'
import { Inline } from '../components/Inline'
import { EXAM_PROFILES, OBJECTIVE_BY_ID, PE1_URL } from '../content/blueprint'
import { useProgress } from '../progress/store'
import { practiceObjectives } from '../quiz/pools'

// Lessons arrive in phase 3; until then each objective shows its syllabus sub-points.
export default function LearnPage() {
  const { objectiveId } = useParams()
  return objectiveId ? <ObjectivePage objectiveId={objectiveId} /> : <LearnIndex />
}

function LearnIndex() {
  const progress = useProgress()
  const objectives = practiceObjectives({ ...progress, extrasInPractice: true })
  const sections = EXAM_PROFILES['30-03'].sections
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Learn</h1>
      <p className="text-slate-600">
        One lesson per syllabus objective. Free extra course:{' '}
        <a href={PE1_URL} className="text-brand-dark underline">
          Python Essentials 1
        </a>
        .
      </p>
      {[...sections, { id: 'x', title: 'PCEP-30-02 extras', objectiveIds: objectives.filter((o) => o.sectionId === 'x').map((o) => o.id) }].map((s) => (
        <section key={s.id} className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="font-semibold">
            {s.id === 'x' ? '' : `${s.id}. `}
            {s.title}
          </h2>
          <ul className="mt-2 space-y-1 text-sm">
            {s.objectiveIds.map((id) => (
              <li key={id}>
                <Link to={`/learn/${id}`} className="text-brand-dark hover:underline">
                  {id} <Inline text={OBJECTIVE_BY_ID.get(id)!.title} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function ObjectivePage({ objectiveId }: { objectiveId: string }) {
  const objective = OBJECTIVE_BY_ID.get(objectiveId)
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
  return (
    <article className="space-y-4">
      <p className="text-sm text-slate-500">
        <Link to="/learn" className="hover:underline">
          ← Learn
        </Link>
      </p>
      <h1 className="text-3xl font-bold">
        {objective.id} <Inline text={objective.title} />
      </h1>
      {objective.sectionId === 'x' && <p className="inline-block rounded bg-accent px-2 py-0.5 text-sm text-slate-900">30-02 only</p>}
      <p className="rounded border border-amber-300 bg-amber-50 p-3 text-sm">The full lesson for this objective is coming soon.</p>
      <h2 className="text-xl font-semibold">What the syllabus covers</h2>
      <ol className="list-decimal space-y-1 pl-6">
        {objective.subpoints.map((s) => (
          <li key={s.id}>
            <Inline text={s.text} />
            {s.exams && <span className="ml-2 text-xs text-slate-500">(PCEP-{s.exams.join(', ')} only)</span>}
          </li>
        ))}
      </ol>
      <Link to={`/practice?objective=${objective.id}`} className="inline-block rounded bg-brand px-4 py-2 text-chalk">
        Practise this objective
      </Link>
    </article>
  )
}
