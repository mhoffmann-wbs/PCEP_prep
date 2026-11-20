// Loads every flashcard file in this folder. Files are JSON arrays named
// <objectiveId>.json; content tests validate them and check stated output.
import { type ExamId, subpointInExam } from '../blueprint'
import { type Card, cardFileSchema } from '../schema'

const files = import.meta.glob<unknown>('./*.json', { eager: true, import: 'default' })

export const CARD_FILES: Record<string, unknown> = Object.fromEntries(
  Object.entries(files).map(([path, data]) => [path.replace(/^.*\/(.+)\.json$/, '$1'), data]),
)

export const CARDS: Card[] = Object.values(CARD_FILES).flatMap((data) => cardFileSchema.parse(data))

/** A card belongs to an exam when every sub-point it covers does. */
export const cardInExam = (card: Card, exam: ExamId) => card.subpoints.every((s) => subpointInExam(s, exam))
