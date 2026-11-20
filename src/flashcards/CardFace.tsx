import { CodeBlock, Inline } from '../components/Inline'
import type { StudyCard } from './decks'

/** Text with `backtick` code spans; blank lines separate paragraphs. */
export function CardText({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/\n\s*\n/)
        .filter((p) => p.trim())
        .map((p, i) => (
          <p key={i} className="whitespace-pre-line">
            <Inline text={p.trim()} />
          </p>
        ))}
    </>
  )
}

/** The question side, plus the answer once `revealed`. */
export function CardFace({ card, revealed }: { card: StudyCard; revealed: boolean }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2 text-lg">
        <CardText text={card.front} />
      </div>
      {card.code && <CodeBlock code={card.code} />}
      {revealed && (
        <section aria-label="Answer" className="space-y-3 border-t border-slate-200 pt-4">
          {(card.output !== undefined || card.raises) && (
            <div>
              <h3 className="text-sm font-medium text-slate-700">{card.raises ? 'Output, then the error' : 'Output'}</h3>
              <pre className="mt-1 whitespace-pre-wrap rounded bg-code p-3 font-mono text-sm text-[#e6edf3]">
                {card.output}
                {card.raises && <span className="text-[#ff9b9b]">{card.raises}</span>}
              </pre>
            </div>
          )}
          <div className="space-y-2">
            <CardText text={card.back} />
          </div>
        </section>
      )}
    </div>
  )
}
