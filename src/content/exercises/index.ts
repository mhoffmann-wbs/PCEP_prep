// Loads every exercise file in this folder. Files are JSON arrays named
// <objectiveId>.json; content tests validate them and run every solution.
import { type Exercise, exerciseFileSchema } from '../schema'

const files = import.meta.glob<unknown>('./*.json', { eager: true, import: 'default' })

export const EXERCISE_FILES: Record<string, unknown> = Object.fromEntries(
  Object.entries(files).map(([path, data]) => [path.replace(/^.*\/(.+)\.json$/, '$1'), data]),
)

export const EXERCISES: Exercise[] = Object.values(EXERCISE_FILES).flatMap((data) => exerciseFileSchema.parse(data))

export const EXERCISE_BY_ID: ReadonlyMap<string, Exercise> = new Map(EXERCISES.map((e) => [e.id, e]))
