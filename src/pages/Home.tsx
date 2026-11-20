import { EXAM_PROFILES } from '../content/blueprint'

export function Home() {
  const exam = EXAM_PROFILES['30-03']
  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold">Python Certification Made Simple</h1>
      <p className="text-lg text-slate-700">
        Learn, check and practise everything on the {exam.name} syllabus: {exam.items} questions in {exam.minutes} minutes,
        {' '}{exam.passPercent}% to pass.
      </p>
    </section>
  )
}
