import type { MDXComponents } from 'mdx/types'
import type { ComponentType } from 'react'
import { type GuideMeta, guideMetaSchema } from '../schema'

// One MDX file per guide: <slug>.mdx (e.g. cheat-sheet.mdx), exporting `meta`.
interface GuideModule {
  default: ComponentType<{ components?: MDXComponents }>
  meta: unknown
}

const modules = import.meta.glob<GuideModule>('./*.mdx', { eager: true })

export interface Guide {
  meta: GuideMeta
  Content: GuideModule['default']
}

export const GUIDES: Map<string, Guide> = new Map(
  Object.values(modules).map((mod) => {
    const meta = guideMetaSchema.parse(mod.meta)
    return [meta.slug, { meta, Content: mod.default }]
  }),
)

/** The guides in the order the nav and the home page list them. */
export const GUIDE_ORDER = ['cheat-sheet', 'exam-day'] as const
