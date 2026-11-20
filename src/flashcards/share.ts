// Own flashcard decks as files people can pass around. A file holds deck names
// and card texts only; review state stays with each learner.
import { z } from 'zod'
import { type CardDraft, type UserCard, type UserDeck, addCards, createDeck, getProgress } from '../progress/store'

const FILE_APP = 'pcep101'
const FILE_KIND = 'flashcards'
const FILE_FORMAT = 1

/** Lengths the card editor enforces too. */
export const LIMITS = { name: 80, front: 1000, back: 2000, code: 4000, cards: 2000 } as const

const text = (max: number) => z.string().trim().min(1).max(max)

const fileSchema = z.object({
  app: z.literal(FILE_APP),
  kind: z.literal(FILE_KIND),
  format: z.literal(FILE_FORMAT),
  decks: z
    .array(
      z.object({
        name: text(LIMITS.name),
        cards: z.array(
          z.object({
            front: text(LIMITS.front),
            back: text(LIMITS.back),
            code: z.string().max(LIMITS.code).nullish(),
          }),
        ),
      }),
    )
    .min(1),
})

export type DeckFile = z.infer<typeof fileSchema>

/** Decks (with their cards) as a JSON document to download. */
export function exportDecks(decks: UserDeck[], cards: UserCard[], at: Date = new Date()): string {
  const doc = {
    app: FILE_APP,
    kind: FILE_KIND,
    format: FILE_FORMAT,
    exportedAt: at.toISOString(),
    decks: decks.map((d) => ({
      name: d.name,
      cards: cards.filter((c) => c.deckId === d.id).map((c) => ({ front: c.front, back: c.back, ...(c.code ? { code: c.code } : {}) })),
    })),
  }
  return JSON.stringify(doc, null, 2)
}

/** A file name for a download, e.g. pcep101-flashcards-loops.json. */
export function deckFileName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `pcep101-flashcards-${slug || 'deck'}.json`
}

/** Reads a deck file. Throws an Error with a message for the learner if it isn't usable. */
export function parseDeckFile(json: string): DeckFile {
  let doc: { app?: unknown; kind?: unknown; format?: unknown }
  try {
    doc = JSON.parse(json)
  } catch {
    throw new Error("This file isn't valid JSON.")
  }
  if (doc?.app !== FILE_APP || doc.kind !== FILE_KIND) throw new Error("This file isn't a PCEP101 flashcard file.")
  if (typeof doc.format === 'number' && doc.format > FILE_FORMAT) {
    throw new Error('This file comes from a newer version of the app. Reload the app, then upload it again.')
  }
  const result = fileSchema.safeParse(doc)
  if (!result.success) throw new Error('This file is damaged or has cards that are empty or too long, so nothing was added.')
  if (result.data.decks.reduce((n, d) => n + d.cards.length, 0) > LIMITS.cards) {
    throw new Error(`This file has more than ${LIMITS.cards} cards, so nothing was added.`)
  }
  return result.data
}

export interface ImportSummary {
  added: number
  /** Cards already in the deck with the same text. */
  skipped: number
  /** Names of decks that didn't exist yet. */
  newDecks: string[]
}

const sameText = (a: Pick<UserCard, 'front' | 'back' | 'code'>, b: Pick<UserCard, 'front' | 'back' | 'code'>) =>
  a.front === b.front && a.back === b.back && (a.code ?? null) === (b.code ?? null)

/**
 * Adds the cards of a deck file to the learner's own decks. A deck whose name
 * matches an existing one is merged into it, skipping cards it already has.
 */
export function importDeckFile(json: string, at: number = Date.now()): ImportSummary {
  const file = parseDeckFile(json)
  const summary: ImportSummary = { added: 0, skipped: 0, newDecks: [] }
  for (const deck of file.decks) {
    const existing = getProgress().decks.find((d) => d.name === deck.name)
    const deckId = existing?.id ?? createDeck(deck.name, at)
    if (!existing) summary.newDecks.push(deck.name)
    const have = getProgress().myCards.filter((c) => c.deckId === deckId)
    const drafts: CardDraft[] = []
    for (const card of deck.cards) {
      const draft = { deckId, front: card.front, back: card.back, code: card.code?.trim() ? card.code : null }
      if ([...have, ...drafts].some((c) => sameText(c, draft))) summary.skipped++
      else drafts.push(draft)
    }
    addCards(drafts, at)
    summary.added += drafts.length
  }
  return summary
}
