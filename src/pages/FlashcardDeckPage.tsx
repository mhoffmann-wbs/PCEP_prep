import { type FormEvent, useState } from 'react'
import { Link, useParams } from 'react-router'
import { CardFace } from '../flashcards/CardFace'
import { type StudyCard, allDecks } from '../flashcards/decks'
import { LIMITS } from '../flashcards/share'
import { addCards, deleteCard, renameDeck, updateCard, useProgress } from '../progress/store'

type Fields = { front: string; back: string; code: string }

const blank: Fields = { front: '', back: '', code: '' }

const field = 'mt-1 block w-full rounded border border-slate-300 bg-white p-2'

/** Front, back and optional code of an own card. */
function CardForm({ initial, submitLabel, onSubmit, onCancel }: { initial: Fields; submitLabel: string; onSubmit: (f: Fields) => void; onCancel?: () => void }) {
  const [f, setF] = useState(initial)
  const set = (key: keyof Fields) => (e: { target: { value: string } }) => setF({ ...f, [key]: e.target.value })
  const ready = f.front.trim() && f.back.trim()
  function submit(e: FormEvent) {
    e.preventDefault()
    if (!ready) return
    onSubmit(f)
    setF(blank)
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Front (the question)</span>
        <textarea value={f.front} onChange={set('front')} maxLength={LIMITS.front} rows={2} className={field} />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Code shown under the question (optional)</span>
        <textarea value={f.code} onChange={set('code')} maxLength={LIMITS.code} rows={3} spellCheck={false} className={`${field} font-mono text-sm`} />
      </label>
      <label className="block">
        <span className="text-sm font-medium text-slate-700">Back (the answer)</span>
        <textarea value={f.back} onChange={set('back')} maxLength={LIMITS.back} rows={3} className={field} />
      </label>
      <p className="text-xs text-slate-500">Put code inside `backticks` in the text. Leave a blank line between paragraphs.</p>
      <div className="flex gap-2">
        <button type="submit" disabled={!ready} className="rounded bg-brand px-4 py-2 text-sm text-chalk disabled:opacity-50">
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded border border-slate-300 px-4 py-2 text-sm">
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

const toFields = (c: StudyCard): Fields => ({ front: c.front, back: c.back, code: c.code ?? '' })
const fromFields = (f: Fields) => ({ front: f.front.trim(), back: f.back.trim(), code: f.code.trim() ? f.code.replace(/\s+$/, '') : null })

export default function FlashcardDeckPage() {
  const { deckId = '' } = useParams()
  const progress = useProgress()
  const deck = allDecks(progress).find((d) => d.id === deckId)
  const [editing, setEditing] = useState<string | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState(deck?.name ?? '')

  if (!deck) {
    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold">Deck not found</h1>
        <p>
          It may have been deleted, or it isn&apos;t part of your exam track.{' '}
          <Link to="/flashcards" className="text-brand-dark underline">
            All decks
          </Link>
        </p>
      </section>
    )
  }

  function rename(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    renameDeck(deck!.id, name.trim())
    setRenaming(false)
  }

  return (
    <section className="space-y-5">
      <div>
        <Link to="/flashcards" className="text-sm text-brand-dark underline">
          ← All decks
        </Link>
        {renaming ? (
          <form onSubmit={rename} className="mt-1 flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Deck name</span>
              <input value={name} maxLength={LIMITS.name} onChange={(e) => setName(e.target.value)} className="mt-1 block rounded border border-slate-300 bg-white px-2 py-1.5" />
            </label>
            <button type="submit" className="rounded border border-brand px-3 py-1.5 text-sm text-brand-dark">
              Save name
            </button>
          </form>
        ) : (
          <h1 className="mt-1 text-2xl font-semibold">
            {deck.name}
            {deck.own && (
              <button type="button" onClick={() => setRenaming(true)} className="ml-3 align-middle text-sm font-normal text-brand-dark underline">
                Rename
              </button>
            )}
          </h1>
        )}
      </div>
      {deck.cards.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Link to={`/flashcards/review?deck=${deck.id}`} className="rounded bg-brand px-4 py-2 text-chalk">
            Review due cards
          </Link>
          <Link to={`/flashcards/review?deck=${deck.id}&all=1`} className="rounded border border-brand px-4 py-2 text-brand-dark">
            Go through all {deck.cards.length}
          </Link>
        </div>
      )}
      {deck.own && (
        <section aria-label="Add a card" className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-semibold">Add a card</h2>
          <CardForm initial={blank} submitLabel="Add card" onSubmit={(f) => addCards([{ deckId: deck.id, ...fromFields(f) }])} />
        </section>
      )}
      <ol aria-label="Cards" className="space-y-3">
        {deck.cards.map((card) => (
          <li key={card.id} className="rounded-lg border border-slate-200 bg-white p-4">
            {editing === card.id ? (
              <CardForm
                initial={toFields(card)}
                submitLabel="Save card"
                onSubmit={(f) => {
                  updateCard(card.id, fromFields(f))
                  setEditing(null)
                }}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <>
                <CardFace card={card} revealed />
                {deck.own && (
                  <div className="mt-3 flex gap-2">
                    <button type="button" onClick={() => setEditing(card.id)} className="rounded border border-slate-300 px-3 py-1 text-sm">
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => window.confirm('Delete this card?') && deleteCard(card.id)}
                      className="rounded border border-slate-300 px-3 py-1 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </>
            )}
          </li>
        ))}
      </ol>
      {deck.cards.length === 0 && !deck.own && <p>No cards in this deck on your exam track.</p>}
    </section>
  )
}
