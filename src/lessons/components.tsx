import { Children, type ComponentProps, type ReactNode, isValidElement, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { CodeBlock } from '../components/Inline'
import { RunnerPanel } from '../components/RunnerPanel'
import { normaliseOutput } from './normalise'

/** The language and text of a fenced block as MDX renders it: <pre><code className="language-x">. */
function fenceOf(node: ReactNode): { lang: string; text: string } | null {
  if (!isValidElement(node)) return null
  const code = (node.props as { children?: ReactNode }).children
  if (!isValidElement(code)) return null
  const props = code.props as { className?: string; children?: ReactNode }
  const lang = props.className?.replace(/^language-/, '') ?? ''
  const text = Children.toArray(props.children).join('').replace(/\n$/, '')
  return { lang, text }
}

const LABELS: Record<string, string> = { output: 'Output', error: 'Error', input: 'Input typed by the user' }

function LabelledBlock({ lang, text }: { lang: string; text: string }) {
  return (
    <div className="not-prose my-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{LABELS[lang]}</p>
      <pre className={`mt-1 rounded-lg border p-3 font-mono text-sm ${lang === 'error' ? 'border-red-600 bg-red-50' : 'border-slate-300 bg-white'}`}>
        {text}
      </pre>
    </div>
  )
}

/** A Python snippet with a Run button that opens an editable runner. */
export function Runnable({ code }: { code: string }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  return (
    <div className="not-prose my-4 space-y-2">
      {open ? (
        <RunnerPanel
          initialCode={code}
          autoRun
          minLines={3}
          renderActions={(current, stdin) => (
            <button
              type="button"
              onClick={() => navigate('/step', { state: { code: current, stdin } })}
              className="rounded border border-slate-300 px-3 py-2 text-sm"
            >
              Step through
            </button>
          )}
        />
      ) : (
        <>
          <CodeBlock code={code} />
          <button type="button" onClick={() => setOpen(true)} className="rounded border border-brand px-3 py-1 text-sm text-brand-dark">
            ▶ Run and edit
          </button>
        </>
      )}
    </div>
  )
}

/** Overrides <pre>: Python becomes runnable; output, error and input blocks get labels. */
function Pre(props: ComponentProps<'pre'>) {
  const fence = fenceOf(<pre {...props} />)
  if (fence?.lang === 'python') return <Runnable code={fence.text} />
  if (fence && fence.lang in LABELS) return <LabelledBlock {...fence} />
  return (
    <div className="not-prose my-4">
      <CodeBlock code={fence?.text ?? ''} />
    </div>
  )
}

/**
 * A predict-the-output check: shows the code, asks for a guess, and only then
 * reveals the real output (and lets the learner run it).
 */
export function Predict({ children }: { children: ReactNode }) {
  // MDX passes the fenced blocks as <pre> elements (rendered through Pre).
  const blocks = Children.toArray(children)
    .map(fenceOf)
    .filter((f): f is { lang: string; text: string } => !!f)
  const code = blocks.find((b) => b.lang === 'python')
  const answer = blocks.find((b) => b.lang === 'output' || b.lang === 'error')
  const [guess, setGuess] = useState('')
  const [revealed, setRevealed] = useState(false)
  if (!code || !answer) return null
  const matched = normaliseOutput(guess) === normaliseOutput(answer.text)
  return (
    <div className="not-prose my-6 space-y-3 rounded-lg border-2 border-accent bg-white p-4">
      <p className="font-semibold">What does this print?</p>
      <CodeBlock code={code.text} />
      <label className="block text-sm">
        Your guess
        <textarea
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          disabled={revealed}
          rows={Math.max(2, answer.text.split('\n').length)}
          spellCheck={false}
          className="mt-1 block w-full rounded border border-slate-300 bg-white p-2 font-mono text-sm"
        />
      </label>
      {revealed ? (
        <>
          <p className={`font-semibold ${matched ? 'text-green-600' : 'text-slate-700'}`}>
            {matched ? '✓ Exactly right.' : 'Compare your guess with the real result:'}
          </p>
          <LabelledBlock {...answer} />
          <Runnable code={code.text} />
        </>
      ) : (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          disabled={guess.trim() === ''}
          className="rounded bg-brand px-4 py-2 text-sm font-medium text-chalk disabled:opacity-40"
        >
          Reveal the answer
        </button>
      )}
      {!revealed && <p className="text-xs text-slate-500">Write your guess first: predicting before you look is what makes it stick.</p>}
    </div>
  )
}

/** Links starting with / go through the router; others open in a new tab. */
function A({ href = '', ...props }: ComponentProps<'a'>) {
  if (href.startsWith('/')) return <Link to={href} {...props} />
  return <a href={href} target="_blank" rel="noreferrer" {...props} />
}

export const lessonComponents = { pre: Pre, a: A, Predict }

/** Overrides <pre> for print-first pages: Python stays static; output, error and input blocks get labels. */
function StaticPre(props: ComponentProps<'pre'>) {
  const fence = fenceOf(<pre {...props} />)
  if (fence && fence.lang in LABELS) return <LabelledBlock {...fence} />
  return (
    <div className="not-prose my-3 break-inside-avoid">
      <CodeBlock code={fence?.text ?? ''} />
    </div>
  )
}

export const guideComponents = { pre: StaticPre, a: A }
