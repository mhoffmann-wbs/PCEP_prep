import { Link } from 'react-router'
import { ExamSettings } from '../components/ExamSettings'
import { Inline } from '../components/Inline'
import { EXAM_PROFILES, OBJECTIVE_BY_ID } from '../content/blueprint'
import { useProgress } from '../progress/store'

const PILLARS = [
  { to: '/learn', title: 'Learn', text: 'One lesson per syllabus objective, written for people new to Python.' },
  { to: '/practice', title: 'Check', text: 'Practice questions in five formats with explanations, and a timed mock exam.' },
  { to: '/exercises', title: 'Do', text: 'Write small programs that are checked in your browser, or experiment in the Playground. No installation needed.' },
]

export default function HomePage() {
  const { track } = useProgress()
  const exam = EXAM_PROFILES[track]
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-3xl font-bold">Python Certification Made Simple</h1>
        <p className="text-lg text-slate-700">
          Learn, check and practise everything on the {exam.name} syllabus: {exam.items} questions in {exam.minutes} minutes,{' '}
          {exam.passPercent}% to pass.
        </p>
      </section>
      <section className="max-w-2xl">
        <ExamSettings parts={['track']} />
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        {PILLARS.map((p) => (
          <Link key={p.to} to={p.to} className="rounded-lg border border-slate-200 bg-white p-4 hover:border-brand">
            <h2 className="text-lg font-semibold text-brand-dark">{p.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{p.text}</p>
          </Link>
        ))}
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">The syllabus</h2>
        <p className="text-sm text-slate-600">
          Weights are the official scoring weights.{' '}
          <a href={exam.syllabusUrl} className="underline">
            Official {exam.name} syllabus
          </a>
        </p>
        {exam.sections.map((s) => (
          <details key={s.id} className="rounded-lg border border-slate-200 bg-white p-4">
            <summary className="flex cursor-pointer justify-between gap-4 font-semibold">
              <span>
                {s.id}. {s.title}
              </span>
              <span className="shrink-0 font-normal text-slate-500">
                {s.weight}% · {s.items} questions
              </span>
            </summary>
            <ul className="mt-2 space-y-1 text-sm">
              {s.objectiveIds.map((id) => (
                <li key={id}>
                  <Link to={`/learn/${id}`} className="text-brand-dark hover:underline">
                    {id} <Inline text={OBJECTIVE_BY_ID.get(id)!.title} />
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </section>
    </div>
  )
}
