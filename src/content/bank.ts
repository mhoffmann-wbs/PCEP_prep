// Loads every question file under src/content/questions/. Files are JSON arrays
// named <objectiveId>.json; content tests validate them against the schema.
import { type ExamId, subpointInExam } from './blueprint'
import { type Item, itemFileSchema } from './schema'

const files = import.meta.glob<unknown>('./questions/*.json', { eager: true, import: 'default' })

export const QUESTION_FILES: Record<string, unknown> = Object.fromEntries(
  Object.entries(files).map(([path, data]) => [path.replace(/^.*\/(.+)\.json$/, '$1'), data]),
)

export const ITEMS: Item[] = Object.values(QUESTION_FILES).flatMap((data) => itemFileSchema.parse(data))

/** An item belongs to an exam when every sub-point it tests does. */
export const itemInExam = (item: Item, exam: ExamId) => item.subpoints.every((s) => subpointInExam(s, exam))
