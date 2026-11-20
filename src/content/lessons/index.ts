import type { MDXComponents } from 'mdx/types'
import type { ComponentType } from 'react'
import { type LessonMeta, lessonMetaSchema } from '../schema'

// One MDX file per objective: <objectiveId>.mdx (e.g. 3.1.1.mdx), exporting `meta`.
interface LessonModule {
  default: ComponentType<{ components?: MDXComponents }>
  meta: unknown
}

const modules = import.meta.glob<LessonModule>('./*.mdx', { eager: true })

export interface Lesson {
  meta: LessonMeta
  Content: LessonModule['default']
}

export const LESSONS: Map<string, Lesson> = new Map(
  Object.values(modules).map((mod) => {
    const meta = lessonMetaSchema.parse(mod.meta)
    return [meta.objectiveId, { meta, Content: mod.default }]
  }),
)

/** Every lesson body must contain these sections, in this order. */
export const REQUIRED_SECTIONS = [
  '## Big idea',
  '## Walkthrough',
  '## Predict the output',
  '## Common mistakes',
  '## Exam traps',
  '## Try it',
] as const
