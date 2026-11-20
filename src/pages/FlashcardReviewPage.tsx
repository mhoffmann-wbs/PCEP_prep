import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { OBJECTIVE_BY_ID } from '../content/blueprint'
import { CardFace } from '../flashcards/CardFace'
import { allDecks, cardsFor } from '../flashcards/decks'
import { type Rating, buildQueue, intervalLabel, rate } from '../flashcards/schedule'
import { getProgress, recordCardReview, useProgress } from '../progress/store'
import { ShortcutHint } from '../quiz/ShortcutHint'
import { useShortcuts } from '../quiz/shortcuts'

const RATINGS: { rating: Rating; label: string; key: string; style: string }[] = [
  { rating: 'again', label: 'Again', key: '1', style: 'border-red-300 bg-red-50' },
  { rating: 'good', label: 'Good', key: '2', style: 'border-brand bg-brand text-chalk' },
  { rating: 'easy', label: 'Easy', key: '3', style: 'border-green-300 bg-green-50' },
]

export default function FlashcardReviewPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const query = { deck: params.get('deck'), objective: params.get('objective') }
  const everything = params.get('all') === '1'
  const progress = useProgress()
  // The session's cards are fixed when it starts; ratings during it don't reshuffle them.
  const [session] = useState(() => {
    const p = getProgress()
    const cards = cardsFor(query, p)
    // A lesson's link goes through all of the objective's cards, due or not.
    const queue = buildQueue(
      cards.map((c) => c.id),
      p.cards,
      Date.now(),
      { everything: everything || Boolean(query.objective) },
    )
    return { cards: new Map(cards.map((c) => [c.id, c])), queue, total: cards.length }
  })
  const [queue, setQueue] = useState(session.queue)
  const [pos, setPos] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [tally, setTally] = useState<Record<Rating, number>>({ again: 0, good: 0, easy: 0 })

  const title = query.objective
    ? `${query.objective} ${OBJECTIVE_BY_ID.get(query.objective)?.title ?? ''}`
    : query.deck
      ? (allDecks(progress).find((d) => d.id === query.deck)?.name ?? 'Deck not found')
      : 'All decks'
  const id = queue[pos]
  const card = id ? session.cards.get(id) : undefined
  const stat = id ? progress.cards[id] : undefined

  function grade(rating: Rating) {
    if (!id || !revealed) return
    recordCardReview(id, rate(stat, rating, Date.now()))
    setTally((t) => ({ ...t, [rating]: t[rating] + 1 }))
    // A missed card comes back at the end of this session.
    if (rating === 'again') setQueue((q) => [...q, id])
    setPos((p) => p + 1)
    setRevealed(false)
  }

  useShortcuts(
    {
      ' ': () => setRevealed(true),
      Enter: () => setRevealed(true),
      '1': () => grade('again'),
      '2': () => grade('good'),
      '3': () => grade('easy'),
    },
    Boolean(card),
  )

  const header = (
    <div>
      <Link to="/flashcards" className="text-sm text-brand-dark underline">
        ← All decks
      </Link>
      <h1 className="mt-1 text-2xl font-semibold">Flashcards: {title}</h1>
    </div>
  )

  if (session.queue.length === 0) {
    const allLink = `/flashcards/review?${new URLSearchParams({ ...(query.deck ? { deck: query.deck } : {}), all: '1' })}`
    return (
      <section className="space-y-4">
        {header}
        {session.total === 0 ? (
          <p>There are no cards here yet.</p>
        ) : (
          <>
            <p>Nothing is due right now. Cards you know come back after a few days.</p>
            <Link to={allLink} className="inline-block rounded border border-brand px-4 py-2 text-brand-dark">
              Go through all {session.total} cards anyway
            </Link>
          </>
        )}
      </section>
    )
  }

  if (!card) {
    const reviewed = tally.again + tally.good + tally.easy
    return (
      <section className="space-y-4">
        {header}
        <h2 className="text-xl font-semibold">Session done</h2>
        <p>
          You went through {session.queue.length} card{session.queue.length === 1 ? '' : 's'} with {reviewed} ratings: {tally.good} Good,{' '}
          {tally.easy} Easy and {tally.again} Again.
        </p>
        <Link to="/flashcards" className="inline-block rounded bg-brand px-4 py-2 text-chalk">
          Back to the decks
        </Link>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      {header}
      <p className="text-sm text-slate-600">
        Card {pos + 1} of {queue.length}
        {!stat && ' · new'}
        {card.objectiveId && ` · objective ${card.objectiveId}`}
      </p>
      <article data-card-id={card.id} className="rounded-lg border border-slate-200 bg-white p-5">
        <CardFace card={card} revealed={revealed} />
      </article>
      {!revealed ? (
        <button type="button" onClick={() => setRevealed(true)} className="rounded bg-brand px-4 py-2 font-medium text-chalk">
          Show answer
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-700">How well did you know it?</p>
          <div className="flex flex-wrap gap-2">
            {RATINGS.map(({ rating, label, style }) => (
              <button key={rating} type="button" onClick={() => grade(rating)} className={`rounded border px-4 py-2 ${style}`}>
                {label} <span className="text-sm opacity-80">({intervalLabel(stat, rating)})</span>
              </button>
            ))}
          </div>
          {card.code && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigate('/playground', { state: { code: card.code } })}
                className="rounded border border-slate-300 px-3 py-1.5 text-sm"
              >
                Open in Playground
              </button>
              <button
                type="button"
                onClick={() => navigate('/step', { state: { code: card.code } })}
                className="rounded border border-slate-300 px-3 py-1.5 text-sm"
              >
                Step through
              </button>
            </div>
          )}
        </div>
      )}
      <ShortcutHint
        items={[
          ['Space', 'show answer'],
          ['1', 'again'],
          ['2', 'good'],
          ['3', 'easy'],
        ]}
      />
    </section>
  )
}
