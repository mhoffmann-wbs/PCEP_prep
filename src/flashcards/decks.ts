// Built-in and own flashcards behind one shape. Built-in cards form one deck per
// 30-03 section (plus one for the 30-02 extras) and follow the learner's track
// and "30-02 topics in practice" toggle, like the practice pools.
import { EXAM_PROFILES } from '../content/blueprint'
import { CARDS, cardInExam } from '../content/flashcards'
import type { Card } from '../content/schema'
import type { Progress, UserCard } from '../progress/store'

export interface StudyCard {
  id: string
  front: string
  back: string
  code: string | null
  /** Built-in cards only: what `code` prints or raises (checked in Pyodide). */
  output?: string
  raises?: string
  objectiveId: string | null
}

export interface Deck {
  /** "s1"…"s5" and "x" for built-in decks, the deck id for own decks. */
  id: string
  name: string
  own: boolean
  cards: StudyCard[]
}

type Settings = Pick<Progress, 'track' | 'extrasInPractice' | 'decks' | 'myCards'>

const fromBuiltIn = (c: Card): StudyCard => ({
  id: c.id,
  front: c.front,
  back: c.back,
  code: c.code ?? null,
  output: c.output,
  raises: c.raises,
  objectiveId: c.objectiveId,
})

export const fromOwn = (c: UserCard): StudyCard => ({ id: c.id, front: c.front, back: c.back, code: c.code, objectiveId: null })

const isExtra = (objectiveId: string) => objectiveId.startsWith('x.')

/** Built-in cards the learner studies on their track. */
export function builtInCards({ track, extrasInPractice }: Pick<Progress, 'track' | 'extrasInPractice'>): StudyCard[] {
  return CARDS.filter((c) => (isExtra(c.objectiveId) ? extrasInPractice : cardInExam(c, track))).map(fromBuiltIn)
}

export function builtInDecks(settings: Pick<Progress, 'track' | 'extrasInPractice'>): Deck[] {
  const cards = builtInCards(settings)
  const decks = EXAM_PROFILES['30-03'].sections.map((s) => ({
    id: `s${s.id}`,
    name: `${s.id}. ${s.title}`,
    own: false,
    cards: cards.filter((c) => c.objectiveId!.startsWith(`${s.id}.`)),
  }))
  const extras = cards.filter((c) => isExtra(c.objectiveId!))
  if (extras.length) decks.push({ id: 'x', name: 'PCEP-30-02 topics', own: false, cards: extras })
  return decks.filter((d) => d.cards.length > 0)
}

export function ownDecks({ decks, myCards }: Pick<Progress, 'decks' | 'myCards'>): Deck[] {
  return decks.map((d) => ({ id: d.id, name: d.name, own: true, cards: myCards.filter((c) => c.deckId === d.id).map(fromOwn) }))
}

export const allDecks = (settings: Settings): Deck[] => [...builtInDecks(settings), ...ownDecks(settings)]

/** What a review page asks for: one deck, one objective's built-in cards, or (neither) every deck. */
export interface CardQuery {
  deck?: string | null
  objective?: string | null
}

export function cardsFor({ deck, objective }: CardQuery, settings: Settings): StudyCard[] {
  if (objective) return builtInCards(settings).filter((c) => c.objectiveId === objective)
  const decks = allDecks(settings)
  if (deck) return decks.find((d) => d.id === deck)?.cards ?? []
  return decks.flatMap((d) => d.cards)
}
