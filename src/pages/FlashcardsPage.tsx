import { type ChangeEvent, type FormEvent, useState } from 'react'
import { Link } from 'react-router'
import { type Deck, builtInDecks, ownDecks } from '../flashcards/decks'
import { NEW_PER_SESSION, buildQueue, countCards } from '../flashcards/schedule'
import { LIMITS, deckFileName, exportDecks, importDeckFile } from '../flashcards/share'
import { createDeck, deleteDeck, getProgress, useProgress } from '../progress/store'

/** Saves text as a file the learner downloads. */
export function download(text: string, name: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}

function DeckRow({ deck, now }: { deck: Deck; now: number }) {
  const { cards } = useProgress()
  const ids = deck.cards.map((c) => c.id)
  const counts = countCards(ids, cards, now)
  const toReview = buildQueue(ids, cards, now).length
  const deckDoc = () => {
    const p = getProgress()
    download(exportDecks(p.decks.filter((d) => d.id === deck.id), p.myCards), deckFileName(deck.name))
  }
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
      <div className="min-w-48 flex-1">
        <Link to={`/flashcards/deck/${deck.id}`} className="font-medium text-brand-dark hover:underline">
          {deck.name}
        </Link>
        <p className="text-sm text-slate-600">
          {counts.total} cards · {counts.fresh} new · {counts.due} due · {counts.learned} learned
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {toReview > 0 ? (
          <Link to={`/flashcards/review?deck=${deck.id}`} className="rounded bg-brand px-3 py-1.5 text-sm text-chalk">
            Review {toReview}
          </Link>
        ) : (
          counts.total > 0 && <span className="px-1 py-1.5 text-sm text-slate-500">Nothing due</span>
        )}
        {deck.own && (
          <>
            <button type="button" onClick={deckDoc} className="rounded border border-slate-300 px-3 py-1.5 text-sm">
              Download
            </button>
            <button
              type="button"
              onClick={() => window.confirm(`Delete the deck "${deck.name}" and its ${counts.total} cards?`) && deleteDeck(deck.id)}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm"
            >
              Delete
            </button>
          </>
        )}
      </div>
    </li>
  )
}

export default function FlashcardsPage() {
  const progress = useProgress()
  const [now] = useState(() => Date.now())
  const [name, setName] = useState('')
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const builtIn = builtInDecks(progress)
  const own = ownDecks(progress)
  const all = [...builtIn, ...own].flatMap((d) => d.cards.map((c) => c.id))
  const toReview = buildQueue(all, progress.cards, now).length

  function addDeck(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    if (progress.decks.some((d) => d.name === trimmed)) {
      setMessage({ ok: false, text: `You already have a deck called "${trimmed}".` })
      return
    }
    createDeck(trimmed)
    setName('')
    setMessage(null)
  }

  async function upload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const { added, skipped, newDecks } = importDeckFile(await file.text())
      const parts = [`Added ${added} card${added === 1 ? '' : 's'}`]
      if (newDecks.length) parts.push(`in the new deck${newDecks.length > 1 ? 's' : ''} ${newDecks.map((n) => `"${n}"`).join(', ')}`)
      if (skipped) parts.push(`(${skipped} you already had were skipped)`)
      setMessage({ ok: true, text: `${parts.join(' ')}.` })
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : String(err) })
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Flashcards</h1>
      <p className="text-slate-700">
        Short questions to recall facts and predict output. Rate each card after you see the answer: cards you know come back after
        longer and longer breaks (1, 3, 7, 16, then 35 days), and cards you missed come back soon. Each session takes the cards that are due,
        then up to {NEW_PER_SESSION} new ones.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {toReview > 0 ? (
          <Link to="/flashcards/review" className="rounded bg-brand px-4 py-2 font-medium text-chalk">
            Review all decks ({toReview})
          </Link>
        ) : (
          <p className="font-medium">Nothing is due right now. Come back tomorrow, or go through a deck anyway.</p>
        )}
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">Built-in decks</h2>
        <p className="text-sm text-slate-600">One deck per exam section, following your exam track.</p>
        <ul className="divide-y divide-slate-200">
          {builtIn.map((d) => (
            <DeckRow key={d.id} deck={d} now={now} />
          ))}
        </ul>
      </section>

      <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold">My decks</h2>
        <p className="text-sm text-slate-600">
          Write your own cards, then download a deck to share it. Anyone can upload the file here to add the cards to their own decks.
          Your cards are kept in this browser and included in the progress export.
        </p>
        {own.length > 0 ? (
          <ul className="divide-y divide-slate-200">
            {own.map((d) => (
              <DeckRow key={d.id} deck={d} now={now} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No decks of your own yet.</p>
        )}
        <form onSubmit={addDeck} className="flex flex-wrap items-end gap-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">New deck name</span>
            <input
              value={name}
              maxLength={LIMITS.name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-64 max-w-full rounded border border-slate-300 bg-white px-2 py-1.5"
            />
          </label>
          <button type="submit" disabled={!name.trim()} className="rounded border border-brand px-3 py-1.5 text-sm text-brand-dark disabled:opacity-50">
            Create deck
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          <label className="cursor-pointer rounded border border-slate-300 px-3 py-1.5 text-sm">
            Upload a deck file
            <input type="file" accept="application/json,.json" onChange={upload} className="sr-only" />
          </label>
          {own.length > 1 && (
            <button
              type="button"
              onClick={() => download(exportDecks(progress.decks, progress.myCards), 'pcep101-flashcards-all.json')}
              className="rounded border border-slate-300 px-3 py-1.5 text-sm"
            >
              Download all my decks
            </button>
          )}
        </div>
        {message && (
          <p role="status" className={message.ok ? 'text-green-700' : 'text-red-700'}>
            {message.text}
          </p>
        )}
      </section>
    </div>
  )
}
