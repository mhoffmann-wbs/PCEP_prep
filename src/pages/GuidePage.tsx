import { Link, useParams } from 'react-router'
import { GUIDES } from '../content/guides'
import { guideComponents } from '../lessons/components'

export default function GuidePage() {
  const { slug } = useParams()
  const guide = slug ? GUIDES.get(slug) : undefined
  if (!guide) {
    return (
      <p>
        No such guide.{' '}
        <Link to="/" className="underline">
          Back to the start page
        </Link>
      </p>
    )
  }
  const { meta, Content } = guide
  return (
    <article className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{meta.title}</h1>
        <p className="text-slate-600">{meta.summary}</p>
        <p className="flex items-center gap-3 text-sm text-slate-500">
          Checked against the syllabus on {meta.updated}
          <button type="button" onClick={() => window.print()} className="rounded border px-3 py-1 print:hidden">
            Print
          </button>
        </p>
      </header>
      <div className="prose max-w-none prose-a:text-brand-dark prose-code:before:content-none prose-code:after:content-none">
        <Content components={guideComponents} />
      </div>
    </article>
  )
}
