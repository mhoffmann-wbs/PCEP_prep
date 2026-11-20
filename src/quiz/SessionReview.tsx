import { Link } from 'react-router'
import { Inline } from '../components/Inline'
import type { Item } from '../content/schema'
import { ItemView } from './ItemView'
import { type Response, grade } from './grade'

/**
 * End-of-session review: every answered item, misses first, each expandable to
 * the full item with the learner's answer, the key and all explanations.
 */
export function SessionReview({ items, answers }: { items: readonly Item[]; answers: Record<string, Response> }) {
  const answered = items.filter((i) => i.id in answers)
  const missed = answered.filter((i) => !grade(i, answers[i.id]!))
  const right = answered.filter((i) => grade(i, answers[i.id]!))
  return (
    <section className="space-y-2">
      <h2 className="text-xl font-semibold">Session review</h2>
      <p className="text-sm text-slate-600">{missed.length > 0 ? 'Misses first. ' : ''}Open an item to see your answer and every explanation.</p>
      <ul className="space-y-2">
        {[...missed, ...right].map((item) => {
          const correct = grade(item, answers[item.id]!)
          return (
            <li key={item.id}>
              <details className={`rounded-lg border-l-4 bg-white p-3 ${correct ? 'border-green-600' : 'border-red-600'}`}>
                <summary className="flex cursor-pointer gap-2">
                  <span aria-label={correct ? 'correct' : 'missed'}>{correct ? '✓' : '✗'}</span>
                  <span className="line-clamp-2">
                    <Inline text={item.stem} />
                  </span>
                </summary>
                <div className="mt-4 space-y-3">
                  <ItemView item={item} response={answers[item.id]!} onChange={() => {}} revealed />
                  <Link to={`/questions/${item.id}`} className="text-sm text-brand-dark underline">
                    Try this item again
                  </Link>
                </div>
              </details>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
